/**
 * Phase 5a: Planning Console v3 (Operator Control Center)
 * Wires Console UI to live CIC service endpoints
 *
 * Data sources (8):
 * - Unified API (3100) → /api/*
 * - CIC Ingestion (3116) → /memory/*, /autonomy/*
 * - Governance (3113) → /governance/log, /governance/queue, /governance/votes
 * - Vault (3111) → /vault/evidence
 * - TorqueQuery (3110) → /memory/search
 * - Knowledge Graph (3107) → /lineage/*
 * - Planning Engine (3114) → /planning/synthesis
 * - Harvester v2 (3115) → /cost/*
 *
 * Controls (6):
 * - Pause/resume ingestion
 * - Invoke skill (with governance gate)
 * - Snapshot export
 * - Restart runtime
 * - Clear approval queue
 */

import express, { Express, Request, Response } from 'express';
import path from 'path';
import fetch from 'node-fetch';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Environment variables for service URLs
const SERVICE_URLS = {
  UNIFIED_API: process.env.REACT_APP_UNIFIED_API_URL || 'http://localhost:3100',
  CIC_INGESTION: process.env.REACT_APP_CICEINGESTION_URL || 'http://localhost:3116',
  GOVERNANCE: process.env.REACT_APP_GOVERNANCE_URL || 'http://localhost:3113',
  VAULT: process.env.REACT_APP_VAULT_URL || 'http://localhost:3111',
  TORQUEQUERY: process.env.REACT_APP_TORQUEQUERY_URL || 'http://localhost:3110',
  KNOWLEDGE_GRAPH: process.env.REACT_APP_KNOWLEDGE_GRAPH_URL || 'http://localhost:3107',
  PLANNING_ENGINE: process.env.REACT_APP_PLANNING_ENGINE_URL || 'http://localhost:3114',
  HARVESTER_V2: process.env.REACT_APP_HARVESTER_V2_URL || 'http://localhost:3115',
};

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../apps/operator-console')));

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Panel Data Fetchers
 */

// Health Panel: Runtime Status
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health data', details: String(error) });
  }
});

// Health Panel: Event Ingestion Rate (Metrics)
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.CIC_INGESTION}/metrics`);
    const data = await response.text();
    res.type('text/plain').send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics', details: String(error) });
  }
});

// Health Panel: Governance Decision Log
app.get('/api/governance/decisions', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const response = await fetch(
      `${SERVICE_URLS.VAULT}/governance/decisions?limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch governance decisions', details: String(error) });
  }
});

// Health Panel: Approval Queue
app.get('/api/approvals/pending', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.GOVERNANCE}/approvals/pending`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: String(error) });
  }
});

// Health Panel: Vector DB Health
app.get('/api/vector/metrics', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.CIC_INGESTION}/vector/metrics`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vector metrics', details: String(error) });
  }
});

// Pipelines Panel: Active Ingestion Jobs
app.get('/api/ingestion/status', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.KNOWLEDGE_GRAPH}/api/knowledge-graph/ingestion/status`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingestion status', details: String(error) });
  }
});

// Pipelines Panel: Queue Depth
app.get('/api/queue/depth', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/queue/depth`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue depth', details: String(error) });
  }
});

// Pipelines Panel: Synthesis Results
app.get('/api/synthesis/results', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 10;
    const response = await fetch(`${SERVICE_URLS.PLANNING_ENGINE}/synthesis/results?limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch synthesis results', details: String(error) });
  }
});

// Pipelines Panel: Errors/Failures
app.get('/api/errors', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/api/errors`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errors', details: String(error) });
  }
});

// Agents Panel: Invocation History
app.get('/api/autonomy/proposals', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const response = await fetch(
      `${SERVICE_URLS.CIC_INGESTION}/autonomy/proposals?limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposals', details: String(error) });
  }
});

// Agents Panel: Approval Audit Trail
app.get('/api/approvals/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 20;
    const response = await fetch(`${SERVICE_URLS.VAULT}/approvals/history?limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval history', details: String(error) });
  }
});

// Agents Panel: Failure Pattern Analysis
app.get('/api/agents/failures', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/agents/failures`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure patterns', details: String(error) });
  }
});

// Agents Panel: Cost Tracking
app.get('/api/cost/tracking', async (req: Request, res: Response) => {
  try {
    const period = req.query.period || 'today';
    const response = await fetch(`${SERVICE_URLS.HARVESTER_V2}/cost/estimate?period=${period}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cost data', details: String(error) });
  }
});

// Alerts Panel: Health Thresholds
app.get('/api/alerts/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/api/alerts/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health alerts', details: String(error) });
  }
});

// Alerts Panel: Drift Warnings
app.get('/api/drift/warnings', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.KNOWLEDGE_GRAPH}/drift/warnings`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drift warnings', details: String(error) });
  }
});

// Alerts Panel: Governance Violations
app.get('/api/violations', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.GOVERNANCE}/violations`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch violations', details: String(error) });
  }
});

// Alerts Panel: Cost Overruns
app.get('/api/cost/alerts', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.HARVESTER_V2}/cost/alerts`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cost alerts', details: String(error) });
  }
});

// Alerts Panel: Guardrail Blocks
app.get('/api/guardrail/blocks', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/guardrail/blocks`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guardrail blocks', details: String(error) });
  }
});

/**
 * Control Surface Endpoints
 */

// Control: Pause Ingestion
app.post('/api/ingestion/pause', async (req: Request, res: Response) => {
  try {
    const { reason, duration } = req.body;
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/ingestion/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, duration }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause ingestion', details: String(error) });
  }
});

// Control: Resume Ingestion
app.post('/api/ingestion/resume', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/ingestion/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume ingestion', details: String(error) });
  }
});

// Control: Invoke Skill (with governance gate)
app.post('/api/autonomy/proposals/invoke', async (req: Request, res: Response) => {
  try {
    const { skillId, parameters } = req.body;
    const response = await fetch(`${SERVICE_URLS.CIC_INGESTION}/autonomy/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId, parameters }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to invoke skill', details: String(error) });
  }
});

// Control: Snapshot Export
app.post('/api/snapshot/export', async (req: Request, res: Response) => {
  try {
    const { snapshotType, format, includeLogs } = req.body;
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/snapshot/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotType, format, includeLogs }),
    });
    // Stream response as file
    response.body?.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export snapshot', details: String(error) });
  }
});

// Control: Runtime Restart
app.post('/api/restart', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restart runtime', details: String(error) });
  }
});

// Control: Clear Approval Queue
app.post('/api/approvals/clear', async (req: Request, res: Response) => {
  try {
    const { filterExpiredOnly } = req.body;
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/approvals/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterExpiredOnly: filterExpiredOnly !== false }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear approvals', details: String(error) });
  }
});

// Skill Registry endpoint (for control: invoke skill dropdown)
app.get('/api/skills', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SERVICE_URLS.UNIFIED_API}/skills`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skills', details: String(error) });
  }
});

/**
 * Proxy endpoints for legacy support
 */
app.get('/api/lineage/:path*', async (req: Request, res: Response) => {
  try {
    const path = req.params.path;
    const response = await fetch(`${SERVICE_URLS.KNOWLEDGE_GRAPH}/lineage/${path}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lineage data', details: String(error) });
  }
});

// Serve static files (index.html as fallback for SPA)
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../apps/operator-console/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Planning Console v3 running on port ${PORT}`);
  console.log(`Service endpoints: ${JSON.stringify(SERVICE_URLS, null, 2)}`);
});

export default app;
