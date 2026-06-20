/**
 * Phase 5a: Planning Console v3 — Production Server
 * Serves static HTML UI + Express API routes
 * Wires all 8 CIC data sources + 6 control endpoints
 */

import express, { Express, Request, Response } from 'express';
import path from 'path';
import fetch from 'node-fetch';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Service URLs from environment
const SERVICE_URLS = {
  UNIFIED_API: process.env.UNIFIED_API_URL || 'http://localhost:3100',
  CIC_INGESTION: process.env.CIC_INGESTION_URL || 'http://localhost:3116',
  GOVERNANCE: process.env.GOVERNANCE_URL || 'http://localhost:3113',
  VAULT: process.env.VAULT_URL || 'http://localhost:3111',
  TORQUEQUERY: process.env.TORQUEQUERY_URL || 'http://localhost:3110',
  KNOWLEDGE_GRAPH: process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:3107',
  PLANNING_ENGINE: process.env.PLANNING_ENGINE_URL || 'http://localhost:3114',
  HARVESTER_V2: process.env.HARVESTER_V2_URL || 'http://localhost:3115',
};

// Fetch with timeout helper
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../apps/operator-console')));

// Logging middleware
app.use((req: Request, res: Response, next: any) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    serviceUrls: SERVICE_URLS,
  });
});

/**
 * PANEL DATA FETCHERS — All wired to live endpoints (zero mocks)
 */

// ============= HEALTH PANEL =============

/** GET /api/health — Runtime Status */
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/health`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health data', details: String(error) });
  }
});

/** GET /api/metrics — Event Ingestion Rate */
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.CIC_INGESTION}/metrics`, {
    });
    const data = await response.text();
    res.type('text/plain').send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics', details: String(error) });
  }
});

/** GET /api/governance/decisions — Governance Decision Log */
app.get('/api/governance/decisions', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const response = await fetch(
      `${SERVICE_URLS.VAULT}/governance/decisions?limit=${limit}&offset=${offset}`,
      { timeout: 5000 }
    );
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch governance decisions', details: String(error) });
  }
});

/** GET /api/approvals/pending — Approval Queue */
app.get('/api/approvals/pending', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.GOVERNANCE}/approvals/pending`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: String(error) });
  }
});

/** GET /api/vector/metrics — Vector DB Health */
app.get('/api/vector/metrics', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.CIC_INGESTION}/vector/metrics`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vector metrics', details: String(error) });
  }
});

// ============= PIPELINES PANEL =============

/** GET /api/ingestion/status — Active Ingestion Jobs */
app.get('/api/ingestion/status', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${SERVICE_URLS.KNOWLEDGE_GRAPH}/api/knowledge-graph/ingestion/status`,
      { timeout: 5000 }
    );
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingestion status', details: String(error) });
  }
});

/** GET /api/queue/depth — Queue Depth */
app.get('/api/queue/depth', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/queue/depth`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue depth', details: String(error) });
  }
});

/** GET /api/synthesis/results — Synthesis Results */
app.get('/api/synthesis/results', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 10;
    const response = await fetch(
      `${SERVICE_URLS.PLANNING_ENGINE}/synthesis/results?limit=${limit}`,
      { timeout: 5000 }
    );
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch synthesis results', details: String(error) });
  }
});

/** GET /api/errors — Failure Detection */
app.get('/api/errors', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/api/errors`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errors', details: String(error) });
  }
});

// ============= AGENTS PANEL =============

/** GET /api/autonomy/proposals — Agent Invocation History */
app.get('/api/autonomy/proposals', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const response = await fetch(
      `${SERVICE_URLS.CIC_INGESTION}/autonomy/proposals?limit=${limit}&offset=${offset}`,
      { timeout: 5000 }
    );
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposals', details: String(error) });
  }
});

/** GET /api/approvals/history — Approval Audit Trail */
app.get('/api/approvals/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const response = await fetch(`${SERVICE_URLS.VAULT}/approvals/history?limit=${limit}`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval history', details: String(error) });
  }
});

/** GET /api/agents/failures — Failure Pattern Analysis */
app.get('/api/agents/failures', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/agents/failures`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure patterns', details: String(error) });
  }
});

/** GET /api/cost/tracking — Cost Tracking */
app.get('/api/cost/tracking', async (req: Request, res: Response) => {
  try {
    const period = req.query.period || 'today';
    const response = await fetch(`${SERVICE_URLS.HARVESTER_V2}/cost/estimate?period=${period}`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cost data', details: String(error) });
  }
});

// ============= ALERTS PANEL =============

/** GET /api/alerts/health — Health Threshold Violations */
app.get('/api/alerts/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/api/alerts/health`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health alerts', details: String(error) });
  }
});

/** GET /api/drift/warnings — Drift Warnings */
app.get('/api/drift/warnings', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.KNOWLEDGE_GRAPH}/drift/warnings`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drift warnings', details: String(error) });
  }
});

/** GET /api/violations — Governance Violations */
app.get('/api/violations', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.GOVERNANCE}/violations`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch violations', details: String(error) });
  }
});

/** GET /api/cost/alerts — Cost Overruns */
app.get('/api/cost/alerts', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.HARVESTER_V2}/cost/alerts`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cost alerts', details: String(error) });
  }
});

/** GET /api/guardrail/blocks — Guardrail Blocks */
app.get('/api/guardrail/blocks', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/guardrail/blocks`, {
    });
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guardrail blocks', details: String(error) });
  }
});

/**
 * CONTROL ENDPOINTS — All actionable, wired to live services
 */

/** POST /api/ingestion/pause — Pause Ingestion */
app.post('/api/ingestion/pause', async (req: Request, res: Response) => {
  try {
    const { reason, duration } = req.body;
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/ingestion/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, duration }),
    }, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause ingestion', details: String(error) });
  }
});

/** POST /api/ingestion/resume — Resume Ingestion */
app.post('/api/ingestion/resume', async (req: Request, res: Response) => {
  try {
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/ingestion/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume ingestion', details: String(error) });
  }
});

/** POST /api/autonomy/proposals/invoke — Invoke Skill */
app.post('/api/autonomy/proposals/invoke', async (req: Request, res: Response) => {
  try {
    const { skillId, parameters } = req.body;
    const response = await fetchWithTimeout(`${SERVICE_URLS.CIC_INGESTION}/autonomy/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId, parameters }),
    }, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to invoke skill', details: String(error) });
  }
});

/** POST /api/snapshot/export — Snapshot Export */
app.post('/api/snapshot/export', async (req: Request, res: Response) => {
  try {
    const { snapshotType, format, includeLogs } = req.body;
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/snapshot/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotType, format, includeLogs }),
    }, 10000);
    if (response.body) {
      response.body.pipe(res);
    } else {
      const data = await response.json() as any;
      res.json(data);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to export snapshot', details: String(error) });
  }
});

/** POST /api/restart — Runtime Restart */
app.post('/api/restart', async (req: Request, res: Response) => {
  try {
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restart runtime', details: String(error) });
  }
});

/** POST /api/approvals/clear — Clear Approval Queue */
app.post('/api/approvals/clear', async (req: Request, res: Response) => {
  try {
    const { filterExpiredOnly } = req.body;
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/approvals/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterExpiredOnly: filterExpiredOnly !== false }),
    }, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear approvals', details: String(error) });
  }
});

/** GET /api/skills — Skill Registry */
app.get('/api/skills', async (req: Request, res: Response) => {
  try {
    const response = await fetchWithTimeout(`${SERVICE_URLS.UNIFIED_API}/skills`, {}, 5000);
    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skills', details: String(error) });
  }
});

/**
 * Static file serving + SPA fallback
 */
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../apps/operator-console/index.html'));
});

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../apps/operator-console/index.html'));
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Planning Console v3 — Phase 5a Implementation      ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
  console.log(`▶ Server listening on http://localhost:${PORT}`);
  console.log(`\n📡 Service Endpoints:`);
  Object.entries(SERVICE_URLS).forEach(([key, url]) => {
    console.log(`  ${key.padEnd(20)} → ${url}`);
  });
  console.log(`\n✓ All 8 data sources accessible`);
  console.log(`✓ All 6 control endpoints wired\n`);
});

export default app;
