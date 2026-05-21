/**
 * routes/cic.js
 * @version 1.0.1
 * @date 2026-05-18
 *
 * CIC Intelligence routes for the control-plane.
 * All routes proxy to the CIC intelligence service (cic-ingestion/intelligence-server.js).
 *
 * Mounted at: /pipelines/cic
 *
 * Routes:
 *   GET  /status            — intelligence service health
 *   POST /ask               — forward a query to the BOB pipeline
 *   POST /ingest            — forward a chunk for embedding + Qdrant storage
 *   POST /pipeline          — full ingest + ask cycle
 *   POST /postiz            — ingest + ask + publish result to social via Postiz
 *
 * Env:
 *   CIC_INTELLIGENCE_URL    — base URL of intelligence service (default: http://localhost:4000)
 *   INTELLIGENCE_TOKEN      — shared bearer token for intelligence service (optional)
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const { fetchWithRetry } = require('../utils/fetch');
const { postInsightsToSocial } = require('../../../integrations/postiz');

const BASE_URL = process.env.CIC_INTELLIGENCE_URL ?? 'http://localhost:4000';
const INT_TOKEN = process.env.INTELLIGENCE_TOKEN;

function intelligenceHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (INT_TOKEN) h['Authorization'] = `Bearer ${INT_TOKEN}`;
  return h;
}

async function proxyPost(req, path, body) {
  const headers = intelligenceHeaders();
  if (req.correlationId) headers['X-Correlation-ID'] = req.correlationId;

  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  }, {
    correlationId: req.correlationId
  });

  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'intelligence service error'), { status: res.status });
  return json;
}

// GET /pipelines/cic/status
router.get('/status', async (req, res) => {
  try {
    const headers = intelligenceHeaders();
    if (req.correlationId) headers['X-Correlation-ID'] = req.correlationId;
    const r = await fetchWithRetry(`${BASE_URL}/health`, { headers }, { correlationId: req.correlationId });
    const json = await r.json();
    res.status(r.ok ? 200 : 502).json(json);
  } catch (err) {
    res.status(502).json({ error: `Intelligence service unreachable: ${err.message}` });
  }
});

// POST /pipelines/cic/ask
router.post('/ask', async (req, res) => {
  try {
    const result = await proxyPost(req, '/ask', req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /pipelines/cic/ingest
router.post('/ingest', async (req, res) => {
  try {
    const result = await proxyPost(req, '/ingest', req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /pipelines/cic/pipeline
router.post('/pipeline', async (req, res) => {
  try {
    const result = await proxyPost(req, '/pipeline', req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// POST /pipelines/cic/postiz
// Body: { user_id, intent, text, source?, channel, metadata? }
router.post('/postiz', async (req, res) => {
  const { user_id, intent, text, source, channel, metadata } = req.body;
  if (!user_id || !intent || !text || !channel) {
    return res.status(400).json({ error: 'user_id, intent, text, channel required' });
  }

  try {
    // 1. Run pipeline: ingest + LLM analysis
    const pipelineResult = await proxyPost(req, '/pipeline', { user_id, intent, text, source });

    // 2. Build social message from LLM answer
    const message = `CIC Research Insight:\n\n${pipelineResult.answer}`.slice(0, 500);

    // 3. Post to social via Postiz integration
    const postResult = await postInsightsToSocial({
      channel,
      message,
      metadata: {
        ...metadata,
        correlation_id:    pipelineResult.correlation_id,
        tokens_prompt:     pipelineResult.tokens_prompt,
        tokens_completion: pipelineResult.tokens_completion,
        strategy:          pipelineResult.strategy,
      },
    });

    res.json({ pipeline: pipelineResult, post: postResult });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

module.exports = router;
