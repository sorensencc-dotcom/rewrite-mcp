/**
 * apps/control-plane/index.js
 * @version 2.3.0
 * @date 2026-05-20
 *
 * CIC Control Plane — Phase 23.
 * Adds: /mas routes (MAS Phase 1-2 Fusion — blackboard observability).
 * Prev: /docgen routes (DocGen Subsystem D — generate, sync, update-index),
 *       per-request correlation_id generation + propagation,
 *       X-Correlation-ID response header, CORS for operator-ui origin.
 *
 * Env:
 *   PORT                — default 3000
 *   GOOGLE_CLIENT_ID    — required unless AUTH_DISABLED=true
 *   AUTH_DISABLED       — "true" for local dev only
 *   CIC_INTELLIGENCE_URL — default http://localhost:4000
 *   INTELLIGENCE_TOKEN  — shared secret for intelligence service
 *   ALLOWED_EMAILS      — comma-separated operator emails
 *   OPERATOR_UI_ORIGIN  — allowed CORS origin (default: http://localhost:8080)
 */

'use strict';

const { config }         = require('./src/config');
require('dotenv').config();

const { randomUUID }     = require('crypto');
const express            = require('express');
const { requireAuth }    = require('./middleware/auth');
const cicRouter          = require('./routes/cic');
const pipelinesRouter    = require('./routes/pipelines');
const agentsRouter       = require('./routes/agents');
const regionsRouter      = require('./routes/regions');
const runsRouter         = require('./routes/runs');
const metricsRouter      = require('./routes/metrics');
const telemetryRouter    = require('./routes/telemetry');
const masRouter          = require('./routes/mas');
const recoveryRouter     = require('./routes/recovery');
const sloRouter          = require('../../projects/cic/control-plane/routes/slo');
const recoveryControlLoop = require('../../projects/cic/control-plane/recovery/control-loop');

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const VERSION = '2.4.0';
const BUILD   = new Date().toISOString().slice(0, 10);

// Start the Autonomous Recovery Loop
recoveryControlLoop.start();

const OPERATOR_UI_ORIGIN = process.env.OPERATOR_UI_ORIGIN ?? 'http://localhost:8080';

// ---------------------------------------------------------------------------
// Middleware — Static Files (Operator UI)
// ---------------------------------------------------------------------------

const path = require('path');
const fs = require('fs').promises;

// Function to inject Google Client ID and serve the dashboard/room
async function serveProtectedHtml(req, res, filePath) {
  try {
    let html = await fs.readFile(filePath, 'utf8');
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    
    const injection = `
      <script>
        window.CIC_GOOGLE_CLIENT_ID = "${clientId}";
        window.CIC_AUTH_DISABLED = ${process.env.AUTH_DISABLED === 'true'};
      </script>
    `;
    
    html = html.replace('</head>', `${injection}\n</head>`);
    res.send(html);
  } catch (err) {
    res.status(500).send(`Error loading UI: ${err.message}`);
  }
}

app.get('/', async (req, res) => {
  await serveProtectedHtml(req, res, path.join(__dirname, '../operator-ui/control-room.html'));
});

// Protect the dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  await serveProtectedHtml(req, res, path.join(__dirname, '../operator-ui/dashboard/index.html'));
});

// Serve other static assets normally
app.use(express.static(path.join(__dirname, '../operator-ui')));

// Serve project documentation
app.use('/docs', express.static(path.join(__dirname, '../../docs')));

// Simple directory listing for releases (used by Release Notes Panel)
app.get('/docs/releases/', async (req, res) => {
  try {
    const dirPath = path.join(__dirname, '../../docs/releases');
    const files = await fs.readdir(dirPath);
    // Return simple HTML links for the dashboard's regex to parse
    const html = files.map(f => `<a href="${f}">${f}</a>`).join('\n');
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><body>${html}</body></html>`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Middleware — CORS (operator-ui origin only; no wildcard in production)
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow Cloudflare-fronted operator UI and local dev
  if (origin === OPERATOR_UI_ORIGIN || /\.rewritelabs\.ai$/.test(origin ?? '')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Correlation-ID');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------------------
// Middleware — correlation_id per request
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  // Honour client-supplied ID (from operator-ui) or generate server-side
  const correlationId = req.headers['x-correlation-id']
    ?? `cp-${randomUUID().slice(0, 12)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// ---------------------------------------------------------------------------
// Middleware — JSON body + structured request logging
// ---------------------------------------------------------------------------

app.use(express.json({ limit: '4mb' }));

app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    process.stdout.write(JSON.stringify({
      ts:             new Date().toISOString(),
      level:          'info',
      msg:            'http_request',
      method:         req.method,
      url:            req.url,
      status:         res.statusCode,
      ms:             Date.now() - t0,
      correlation_id: req.correlationId,
      operator:       req.operator?.email ?? null,
    }) + '\n');
  });
  next();
});

// ---------------------------------------------------------------------------
// Public routes (no auth)
// ---------------------------------------------------------------------------

app.get('/health', (req, res) => {
  res.json({
    ok:      true,
    service: 'cic-control-plane',
    version: VERSION,
    build:   BUILD,
    ts:      new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Protected routes — require Google ID token
// ---------------------------------------------------------------------------

app.use('/pipelines/cic', requireAuth, cicRouter);
app.use('/pipelines',     requireAuth, pipelinesRouter);
app.use('/agents',        requireAuth, agentsRouter);
app.use('/regions',       requireAuth, regionsRouter);
app.use('/runs',          requireAuth, runsRouter);
app.use('/metrics',       requireAuth, metricsRouter);
app.use('/telemetry',     requireAuth, telemetryRouter);
app.use('/mas',           requireAuth, masRouter);
app.use('/recovery',      requireAuth, recoveryRouter);

// Antigravity SLO Metrics
app.use('/api/control-plane/metrics/slo', requireAuth, sloRouter);
app.use('/metrics/slo',                   requireAuth, sloRouter);

// ---------------------------------------------------------------------------
// 404 + error handler
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: `No route: ${req.method} ${req.url}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status ?? 500;
  process.stderr.write(JSON.stringify({
    ts:             new Date().toISOString(),
    level:          'error',
    msg:            'unhandled_error',
    url:            req.url,
    correlation_id: req.correlationId,
    operator:       req.operator?.email ?? null,
    err:            err.message,
    stack:          err.stack,
  }) + '\n');
  res.status(status).json({ error: err.message });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

app.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(JSON.stringify({
    ts:      new Date().toISOString(),
    level:   'info',
    msg:     'server_start',
    service: 'cic-control-plane',
    port:    PORT,
    version: VERSION,
    auth:    process.env.AUTH_DISABLED === 'true' ? 'disabled' : 'google',
  }) + '\n');
});
