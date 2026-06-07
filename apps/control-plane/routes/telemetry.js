/**
 * routes/telemetry.js
 * @version 1.0.0
 * @date 2026-05-18
 *
 * Proxy for the Prompt Telemetry service (tools/prompt-telemetry).
 *
 * Mounted at: /telemetry
 *
 * Routes:
 *   GET /packs
 *   GET /drift
 *   GET /model-calls
 *   GET /pipelines
 *
 * Env:
 *   PROMPT_TELEMETRY_URL — default http://localhost:4310
 */

'use strict';

const express = require('express');
const router  = express.Router();
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const TELEMETRY_URL = process.env.PROMPT_TELEMETRY_URL ?? 'http://localhost:4310';

async function proxyGet(path) {
  const res = await fetch(`${TELEMETRY_URL}${path}`);
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'telemetry service error'), { status: res.status });
  return json;
}

router.get('/packs', async (req, res) => {
  try {
    const result = await proxyGet('/telemetry/packs');
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/drift', async (req, res) => {
  try {
    const result = await proxyGet('/telemetry/drift');
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/model-calls', async (req, res) => {
  try {
    const result = await proxyGet('/telemetry/model-calls');
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/pipelines', async (req, res) => {
  try {
    const result = await proxyGet('/telemetry/pipelines');
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/trace/:correlationId', async (req, res) => {
  try {
    const result = await proxyGet(`/telemetry/trace/${req.params.correlationId}`);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

module.exports = router;
