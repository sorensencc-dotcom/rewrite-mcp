/**
 * intelligence-server.js
 * @version 1.1.0
 * @date 2026-05-20
 *
 * CIC Intelligence HTTP server — Phase 18 §4.
 * Exposes the BOB pipeline as a REST service consumable by the control-plane.
 *
 * Routes:
 *   GET  /health          — liveness + version info
 *   GET  /agents          — list available agents and their status
 *   POST /ask             — context-backed LLM query (no ingest)
 *   POST /ingest          — embed + store chunk in cic_context
 *   POST /pipeline        — ingest + ask in a single call (standard flow)
 *
 * Required env: ANTHROPIC_API_KEY, OPENAI_API_KEY, QDRANT_URL
 * Optional env: PORT (default 4000), INTELLIGENCE_TOKEN (shared secret for control-plane)
 *
 * Start: node src/server/intelligence-server.js
 */

import 'dotenv/config';
import http           from 'node:http';
import crypto         from 'node:crypto';
import fs             from 'node:fs';
import path           from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, ingestChunk } from '../llm/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { runPipeline }      from '../pipeline/run-pipeline.js';
import { log }              from '../logging/logger.js';
import {
  loadCurrentPlaybook,
  getPlaybookHistory,
  simulateCandidate,
  promotePlaybook,
  rollbackPlaybook,
  evolvePlaybookCycle
} from '../playbook/index.js';
import { getHeadroomTelemetry } from '../lib/headroomTelemetry.js';
import { getHeadroomAutotuneState } from '../lib/headroomAutotune.js';
import { evaluatePolicies, getPolicyState } from '../lib/headroomPolicyEngine.js';


const PORT    = parseInt(process.env.PORT ?? '4000', 10);
const TOKEN   = process.env.INTELLIGENCE_TOKEN;  // optional shared secret
const VERSION = '1.1.0';
const BUILD   = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function checkToken(req) {
  if (!TOKEN) return true; // token auth disabled
  const auth = req.headers['authorization'] ?? '';
  return auth === `Bearer ${TOKEN}`;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 
    'Content-Type': 'application/json', 
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-ID'
  });
  res.end(payload);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleHealth(req, res) {
  send(res, 200, {
    ok:      true,
    service: 'cic-intelligence',
    version: VERSION,
    build:   BUILD,
    ts:      new Date().toISOString(),
  });
}

async function handleAgents(req, res) {
  send(res, 200, {
    agents: [
      { id: 'INGEST', name: 'Ingest Agent', status: 'ok', version: '1.0.0', ts: new Date().toISOString() },
      { id: 'ENRICH', name: 'Enrich Agent', status: 'ok', version: '1.0.0', ts: new Date().toISOString() },
      { id: 'ORCHESTRATE', name: 'Orchestrator', status: 'ok', version: '1.0.0', ts: new Date().toISOString() },
      { id: 'SYNTHESIZE', name: 'Synthesizer', status: 'ok', version: '1.0.0', ts: new Date().toISOString() },
      { id: 'AUDIT', name: 'Audit Agent', status: 'ok', version: '1.0.0', ts: new Date().toISOString() },
      { id: 'MODELS', name: 'Model Control', status: 'ok', version: '1.0.0', ts: new Date().toISOString() }
    ]
  });
}

async function handleAsk(req, res) {
  const { user_id, intent, input_text } = await readBody(req);
  if (!user_id || !intent || !input_text) {
    return send(res, 400, { error: 'user_id, intent, input_text required' });
  }
  const correlation_id = req.headers['x-correlation-id'] || crypto.randomUUID();
  const result = await ask({ user_id, intent, input_text, correlation_id });
  log.llmCall({ ...result, user_id, intent, correlation_id });
  send(res, 200, { correlation_id, ...result });
}

async function handleIngest(req, res) {
  const { user_id, intent, text } = await readBody(req);
  if (!user_id || !intent || !text) {
    return send(res, 400, { error: 'user_id, intent, text required' });
  }
  const correlation_id = req.headers['x-correlation-id'] || crypto.randomUUID();
  await ingestChunk({ user_id, intent, text });
  log.qdrantUpsert({ user_id, intent, vector_size: 1536, collection: 'cic_context', correlation_id });
  send(res, 200, { ok: true, correlation_id });
}

async function handlePipeline(req, res) {
  const { user_id, intent, text, source } = await readBody(req);
  if (!user_id || !intent || !text) {
    return send(res, 400, { error: 'user_id, intent, text required' });
  }
  const correlation_id = req.headers['x-correlation-id'] || crypto.randomUUID();

  if (process.env.MOCK_INTELLIGENCE === 'true') {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
    return send(res, 200, {
      correlation_id,
      answer: "This is a mock response for stress testing.",
      tokens_prompt: 100,
      tokens_completion: 50,
      strategy: "full",
      cache_hit: false
    });
  }

  const result = await runPipeline({ user_id, intent, text, source, correlation_id });
  send(res, 200, { correlation_id, ...result });
}

async function handlePlaybookCurrent(req, res) {
  const playbook = await loadCurrentPlaybook();
  send(res, 200, playbook);
}

async function handlePlaybookHistory(req, res) {
  const history = await getPlaybookHistory();
  send(res, 200, { history });
}

async function handlePlaybookSimulate(req, res) {
  const body = await readBody(req);
  const { candidate, N = 500 } = body;
  
  if (!candidate || !candidate.playbook) {
    return send(res, 400, { error: 'candidate.playbook is required for simulation' });
  }

  const current = await loadCurrentPlaybook();
  const simResult = await simulateCandidate(candidate, [], current, N);
  send(res, 200, simResult);
}

async function handlePlaybookPromote(req, res) {
  const body = await readBody(req);
  const { rollback, playbook, score = 1.0, mutation = 'manual' } = body;

  if (rollback) {
    const result = await rollbackPlaybook();
    return send(res, result.success ? 200 : 400, result);
  }

  if (!playbook || !playbook.version) {
    return send(res, 400, { error: 'playbook with a valid version is required for promotion' });
  }

  const result = await promotePlaybook(playbook, score, mutation);
  send(res, 200, { promoted: true, ...result });
}

async function handlePlaybookEvolve(req, res) {
  const body = await readBody(req);
  const { minEvents = 5, N = 500 } = body;
  const result = await evolvePlaybookCycle({ minEvents, N });
  send(res, 200, result);
}

async function handleTelemetryHeadroom(req, res) {
  send(res, 200, getHeadroomTelemetry());
}

async function handleTelemetryHeadroomAutotune(req, res) {
  send(res, 200, getHeadroomAutotuneState());
}

async function handleTelemetryHeadroomPolicy(req, res) {
  evaluatePolicies();
  send(res, 200, getPolicyState());
}


// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const ROUTES = {
  'GET /health':    handleHealth,
  'GET /agents':    handleAgents,
  'POST /ask':      handleAsk,
  'POST /ingest':   handleIngest,
  'POST /pipeline': handlePipeline,
  'GET /playbook/current':  handlePlaybookCurrent,
  'GET /playbook/history':  handlePlaybookHistory,
  'POST /playbook/simulate': handlePlaybookSimulate,
  'POST /playbook/promote':  handlePlaybookPromote,
  'POST /playbook/evolve':   handlePlaybookEvolve,
  'GET /telemetry/headroom': handleTelemetryHeadroom,
  'GET /telemetry/headroom-autotune': handleTelemetryHeadroomAutotune,
  'GET /telemetry/headroom-policy': handleTelemetryHeadroomPolicy,
};


// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const urlPath = req.url?.split('?')[0] ?? '';
  if (req.method === 'GET' && (urlPath === '/dashboard' || urlPath.startsWith('/dashboard/'))) {
    let subPath = urlPath === '/dashboard' ? 'index.html' : urlPath.substring('/dashboard/'.length);
    if (!subPath || subPath === '/') subPath = 'index.html';

    const dashboardDir = path.resolve(__dirname, '../../dashboard');
    const filePath = path.join(dashboardDir, subPath);

    if (!filePath.startsWith(dashboardDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    });
    return;
  }

  const key = `${req.method} ${urlPath}`;

  // Auth check (skip /health, /telemetry/headroom, /telemetry/headroom-autotune, and /telemetry/headroom-policy)
  if (
    req.url !== '/health' &&
    req.url !== '/telemetry/headroom' &&
    req.url !== '/telemetry/headroom-autotune' &&
    req.url !== '/telemetry/headroom-policy' &&
    !checkToken(req)
  ) {
    log.warn('auth_rejected', { url: req.url, method: req.method });
    return send(res, 401, { error: 'Unauthorized' });
  }


  const handler = ROUTES[key];
  if (!handler) {
    return send(res, 404, { error: `No route: ${key}` });
  }

  try {
    await handler(req, res);
  } catch (err) {
    const status = err.status ?? 500;
    log.error('request_error', { url: req.url, method: req.method, err: err.message, status });
    send(res, status, { error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log.info('server_start', { service: 'cic-intelligence', port: PORT, version: VERSION });
});

server.on('error', err => {
  log.error('server_error', { err: err.message });
  process.exit(1);
});
