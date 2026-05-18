/**
 * Control Plane — HTTP Service
 * File: services/control-plane/index.js | Version: 1.1.0 | Date: 2026-05-16
 *
 * Standalone HTTP service mounted at /api/control-plane
 * No external runtime dependencies — uses Node built-ins only (http, crypto, url).
 *
 * Start:
 *   node services/control-plane/index.js
 *   PORT=4000 node services/control-plane/index.js
 *
 * Routes:
 *   GET  /api/control-plane/pipelines
 *   GET  /api/control-plane/pipelines/:id
 *   GET  /api/control-plane/pipelines/:id/runs   (last runs summary)
 *   POST /api/control-plane/pipelines/:id/runs   (trigger — only mutating endpoint)
 *   GET  /api/control-plane/agents
 *   GET  /api/control-plane/agents/:id
 *   GET  /api/control-plane/runs
 *   GET  /api/control-plane/runs/:id
 *   GET  /api/control-plane/metrics
 *   GET  /api/control-plane/analyzers
 *   GET  /api/control-plane/analyzers/:key
 *
 * Invariants enforced here:
 *   - Only POST /pipelines/:id/runs mutates state
 *   - Every response includes { requestId, timestamp, source }
 *   - CORS headers always present (for operator-ui on same host, different port)
 *   - All request bodies are size-limited (MAX_BODY_BYTES)
 */

'use strict';

import { createServer }       from 'node:http';
import { randomUUID }         from 'node:crypto';
import { URL, fileURLToPath } from 'node:url';
import { join, dirname, extname } from 'node:path';
import { readFile }           from 'node:fs/promises';
import { createLogger }       from '../../castironforge/src/cic/cic/core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const UI_ROOT    = join(__dirname, '../../operator-ui');

import { handler as pipelinesHandler } from './routes/pipelines.js';
import { handler as agentsHandler }    from './routes/agents.js';
import { handler as runsHandler }      from './routes/runs.js';
import { handler as metricsHandler }   from './routes/metrics.js';
import { handler as analyzersHandler } from './routes/analyzers.js';

const log = createLogger('control-plane/server');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT           = parseInt(process.env.CONTROL_PLANE_PORT ?? '4000', 10);
const SOURCE         = 'control-plane/v1.1.0';
const BASE_PATH      = '/api/control-plane';
const MAX_BODY_BYTES = 256 * 1024; // 256 KB

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function send(res, status, data, requestId, error) {
  const body = JSON.stringify({
    requestId:  requestId ?? randomUUID(),
    timestamp:  new Date().toISOString(),
    source:     SOURCE,
    ...(error != null ? { error } : { data }),
  });
  res.writeHead(status, {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...CORS_HEADERS,
  });
  res.end(body);
}

function sendError(res, status, message, requestId) {
  send(res, status, null, requestId, message);
}

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

async function serveStatic(res, pathname) {
  const relPath = pathname === '/' ? 'control-room.html' : pathname;
  if (relPath.includes('..')) return sendError(res, 403, 'FORBIDDEN');
  const fullPath = join(UI_ROOT, relPath);
  try {
    const content = await readFile(fullPath);
    const ext = extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type':   MIME_TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': content.length,
      ...CORS_HEADERS,
    });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') return sendError(res, 404, `NOT_FOUND: ${pathname}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Body reader
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) { req.destroy(); reject(new Error('BODY_TOO_LARGE')); return; }
      chunks.push(chunk);
    });
    req.on('end',   () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseJSON(raw) {
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); }
  catch (_) { throw new Error('INVALID_JSON_BODY'); }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function match(pattern, pathname) {
  const patParts = pattern.split('/');
  const urlParts = pathname.split('/');
  if (patParts.length !== urlParts.length) return { matched: false, params: {} };
  const params = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patParts[i] !== urlParts[i]) {
      return { matched: false, params: {} };
    }
  }
  return { matched: true, params };
}

async function dispatch(req, res) {
  const requestId = randomUUID();
  const parsed    = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname  = parsed.pathname;
  const query     = Object.fromEntries(parsed.searchParams);
  const method    = req.method?.toUpperCase() ?? 'GET';

  log.info('request', { requestId, method, pathname });

  // Static UI
  if (!pathname.startsWith(BASE_PATH)) {
    if (method !== 'GET') return sendError(res, 405, `METHOD_NOT_ALLOWED_FOR_STATIC: ${method}`, requestId);
    return serveStatic(res, pathname);
  }

  // Method guard
  if (method !== 'GET' && method !== 'POST' && method !== 'OPTIONS') {
    return sendError(res, 405, `METHOD_NOT_ALLOWED: ${method}`, requestId);
  }
  if (method === 'POST') {
    const triggerCheck = match(`${BASE_PATH}/pipelines/:id/runs`, pathname);
    if (!triggerCheck.matched) return sendError(res, 405, `POST_NOT_ALLOWED_ON: ${pathname}`, requestId);
  }

  // ---------------------------------------------------------------------------
  // Route table — flat if/else-if chain, one match per request
  // ---------------------------------------------------------------------------
  let result;

  const mPipelinesList = match(`${BASE_PATH}/pipelines`,         pathname);
  const mPipelineGet   = match(`${BASE_PATH}/pipelines/:id`,     pathname);
  const mPipelineRuns  = match(`${BASE_PATH}/pipelines/:id/runs`,pathname);
  const mAgentsList    = match(`${BASE_PATH}/agents`,            pathname);
  const mAgentGet      = match(`${BASE_PATH}/agents/:id`,        pathname);
  const mRunsList      = match(`${BASE_PATH}/runs`,              pathname);
  const mRunGet        = match(`${BASE_PATH}/runs/:id`,          pathname);
  const mMetrics       = match(`${BASE_PATH}/metrics`,           pathname);
  const mAnalyzersList = match(`${BASE_PATH}/analyzers`,         pathname);
  const mAnalyzerGet   = match(`${BASE_PATH}/analyzers/:key`,    pathname);

  if (mPipelinesList.matched && method === 'GET') {
    result = await pipelinesHandler('list', {});

  } else if (mPipelineGet.matched && method === 'GET') {
    result = await pipelinesHandler('get', { id: mPipelineGet.params.id });

  } else if (mPipelineRuns.matched && method === 'GET') {
    result = runsHandler('list', { query: { pipelineId: mPipelineRuns.params.id, ...query } });

  } else if (mPipelineRuns.matched && method === 'POST') {
    let payload = {};
    try {
      const raw = await readBody(req);
      payload = parseJSON(raw);
    } catch (err) {
      return sendError(res, 400, err.message, requestId);
    }
    result = await pipelinesHandler('trigger', { id: mPipelineRuns.params.id, payload });

  } else if (mAgentsList.matched && method === 'GET') {
    result = agentsHandler('list', {});

  } else if (mAgentGet.matched && method === 'GET') {
    result = agentsHandler('get', { id: mAgentGet.params.id });

  } else if (mRunsList.matched && method === 'GET') {
    result = runsHandler('list', { query });

  } else if (mRunGet.matched && method === 'GET') {
    result = runsHandler('get', { id: mRunGet.params.id });

  } else if (mMetrics.matched && method === 'GET') {
    result = metricsHandler(query);

  } else if (mAnalyzersList.matched && method === 'GET') {
    result = await analyzersHandler({ action: 'list', params: {} });

  } else if (mAnalyzerGet.matched && method === 'GET') {
    result = await analyzersHandler({ action: 'get', params: { key: mAnalyzerGet.params.key } });

  } else if (pathname === `${BASE_PATH}/healthz`) {
    result = { status: 200, body: { status: 'ok' } };

  } else if (pathname === `${BASE_PATH}/version`) {
    result = {
      status: 200,
      body: { version: '1.1.0', uiBuild: 'cp-ui-build:v14', ts: new Date().toISOString() },
    };

  } else if (pathname === BASE_PATH || pathname === `${BASE_PATH}/`) {
    result = {
      status: 200,
      body: {
        service: SOURCE,
        routes: [
          'GET  /api/control-plane/healthz',
          'GET  /api/control-plane/version',
          'GET  /api/control-plane/pipelines',
          'GET  /api/control-plane/pipelines/:id',
          'GET  /api/control-plane/pipelines/:id/runs',
          'POST /api/control-plane/pipelines/:id/runs',
          'GET  /api/control-plane/agents',
          'GET  /api/control-plane/agents/:id',
          'GET  /api/control-plane/runs',
          'GET  /api/control-plane/runs/:id',
          'GET  /api/control-plane/metrics',
          'GET  /api/control-plane/analyzers',
          'GET  /api/control-plane/analyzers/:key',
        ],
      },
    };

  } else {
    result = { status: 404, body: null, error: `NOT_FOUND: ${pathname}` };
  }

  // ---------------------------------------------------------------------------
  // Emit response
  // ---------------------------------------------------------------------------
  if (!result) return sendError(res, 500, 'INTERNAL: no result produced', requestId);

  if (result.error) {
    sendError(res, result.status, result.error, requestId);
  } else {
    send(res, result.status, result.body, requestId);
  }
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  try {
    await dispatch(req, res);
  } catch (err) {
    log.error('unhandled', { error: err.message, stack: err.stack });
    try { sendError(res, 500, `INTERNAL_ERROR: ${err.message}`, randomUUID()); } catch (_) {}
  }
});

server.on('error', err => {
  log.error('server.error', { error: err.message });
  process.exit(1);
});

server.listen(PORT, () => {
  log.info('server.listening', { port: PORT, base: BASE_PATH, source: SOURCE });
  process.stdout.write(JSON.stringify({ level: 'info', msg: 'control-plane ready', port: PORT }) + '\n');
});

process.on('SIGTERM', () => { log.info('server.shutdown', { signal: 'SIGTERM' }); server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { log.info('server.shutdown', { signal: 'SIGINT'  }); server.close(() => process.exit(0)); });
