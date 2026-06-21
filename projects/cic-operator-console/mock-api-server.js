/**
 * Mock API Server for Console v3
 * Responds to all /api/cic/* and /api/agents/* endpoints with realistic test data
 *
 * Usage:
 *   node mock-api-server.js
 *
 * Server runs on http://localhost:8080
 * Frontend (localhost:5173) proxies /api to this server via vite.config.ts
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// ── Test Data Generators ──────────────────────────────────────────────────────

/**
 * Generate realistic health status that cycles through states
 */
function generateHealth() {
  const states = ['green', 'green', 'green', 'yellow', 'green']; // mostly green
  const status = states[Math.floor(Math.random() * states.length)];
  return {
    status,
    uptimePercent: 99.2 + Math.random() * 0.8,
    activeServices: Math.floor(18 + Math.random() * 4),
    lastErrorAt: status === 'green' ? null : new Date(Date.now() - Math.random() * 3600000).toISOString(),
  };
}

/**
 * Generate mock pipelines with various states
 */
function generatePipelines() {
  const pipelines = [
    {
      id: 'phase-27-aperture',
      name: 'Phase 27: Aperture Execution',
      progressPercent: 65,
      etaSeconds: Math.floor(1200 + Math.random() * 600),
      status: 'running',
    },
    {
      id: 'phase-28-validation',
      name: 'Phase 28: Input Validation',
      progressPercent: 92,
      etaSeconds: Math.floor(240 + Math.random() * 120),
      status: 'running',
    },
    {
      id: 'phase-26-torque',
      name: 'Phase 26: TorqueQuery',
      progressPercent: 100,
      etaSeconds: null,
      status: 'complete',
    },
  ];

  // Randomly adjust progress to simulate live updates
  return pipelines.map(p => ({
    ...p,
    progressPercent: Math.min(100, p.progressPercent + (Math.random() - 0.3) * 5),
    etaSeconds: p.etaSeconds ? Math.max(60, p.etaSeconds - Math.random() * 100) : null,
  }));
}

/**
 * Generate mock alerts with varying severity
 */
function generateAlerts() {
  const alerts = [
    {
      id: 'alert-001',
      severity: 'info',
      title: 'Schema Validation Passed',
      message: 'Input validation suite completed successfully',
      timestamp: new Date(Date.now() - Math.random() * 600000).toISOString(),
      source: 'ValidationPipeline',
    },
    {
      id: 'alert-002',
      severity: 'warning',
      title: 'High Memory Usage',
      message: 'TorqueQuery index using 2.3GB (threshold: 2.5GB)',
      timestamp: new Date(Date.now() - Math.random() * 1200000).toISOString(),
      source: 'MemoryMonitor',
    },
    {
      id: 'alert-003',
      severity: 'info',
      title: 'Agent Heartbeat',
      message: 'Claude-code-guide agent reported healthy status',
      timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
      source: 'AgentMonitor',
    },
  ];

  // Randomly inject a critical alert sometimes
  if (Math.random() < 0.2) {
    alerts.push({
      id: 'alert-critical-001',
      severity: 'critical',
      title: 'Database Connection Lost',
      message: 'PostgreSQL replica unavailable, failover in progress',
      timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
      source: 'DatabaseMonitor',
    });
  }

  return alerts.slice(0, 4);
}

/**
 * Generate workspace/user data
 */
function generateWorkspace() {
  return {
    user: {
      id: 'user-001',
      name: 'Chris Sorensen',
      email: 'sorensencc@gmail.com',
      role: 'Operator',
    },
    permissions: [
      { name: 'cic:read', granted: true },
      { name: 'cic:execute', granted: true },
      { name: 'cic:approve', granted: true },
      { name: 'agents:invoke', granted: true },
      { name: 'vault:write', granted: true },
    ],
    activityLog: [
      {
        id: 'log-001',
        action: 'Started Phase 27 execution',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        actor: 'Chris Sorensen',
      },
      {
        id: 'log-002',
        action: 'Approved governance proposal GAP-001',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        actor: 'Chris Sorensen',
      },
      {
        id: 'log-003',
        action: 'Dashboard view accessed',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        actor: 'Chris Sorensen',
      },
    ],
  };
}

/**
 * Generate agent summaries
 */
function generateAgents() {
  return [
    {
      id: 'agent-claude-code-guide',
      name: 'Claude Code Guide',
      status: 'online',
      lastExecution: new Date(Date.now() - Math.random() * 300000).toISOString(),
      costLast5m: 0.45 + Math.random() * 0.1,
      heartbeat: {
        latencyMs: Math.floor(80 + Math.random() * 40),
        lastPulse: new Date(Date.now() - Math.random() * 10000).toISOString(),
      },
    },
    {
      id: 'agent-ijfw-architect',
      name: 'IJFW Architect',
      status: 'online',
      lastExecution: new Date(Date.now() - Math.random() * 600000).toISOString(),
      costLast5m: 0.32 + Math.random() * 0.08,
      heartbeat: {
        latencyMs: Math.floor(95 + Math.random() * 50),
        lastPulse: new Date(Date.now() - Math.random() * 15000).toISOString(),
      },
    },
    {
      id: 'agent-explorer',
      name: 'Explore Agent',
      status: 'degraded',
      lastExecution: new Date(Date.now() - Math.random() * 1200000).toISOString(),
      costLast5m: 0.18 + Math.random() * 0.05,
      heartbeat: {
        latencyMs: Math.floor(200 + Math.random() * 150),
        lastPulse: new Date(Date.now() - Math.random() * 25000).toISOString(),
      },
    },
  ];
}

/**
 * Generate agent detail
 */
function generateAgentDetail(agentId) {
  const agents = {
    'agent-claude-code-guide': {
      name: 'Claude Code Guide',
      version: '4.5-20251001',
      region: 'us-west-2',
      capabilities: ['code-analysis', 'documentation', 'api-reference'],
    },
    'agent-ijfw-architect': {
      name: 'IJFW Architect',
      version: '1.0.0',
      region: 'us-west-2',
      capabilities: ['planning', 'design', 'architecture-review'],
    },
    'agent-explorer': {
      name: 'Explore Agent',
      version: '0.9.0',
      region: 'us-east-1',
      capabilities: ['code-search', 'pattern-matching', 'file-discovery'],
    },
  };

  const metadata = agents[agentId] || agents['agent-claude-code-guide'];

  return {
    id: agentId,
    metadata,
    heartbeat: {
      latencyMs: Math.floor(80 + Math.random() * 100),
      queueDepth: Math.floor(Math.random() * 5),
      health: 'online',
      lastPulse: new Date().toISOString(),
    },
    costTimeline: Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - (20 - i) * 60000).toISOString(),
      cost: (0.2 + Math.random() * 0.3),
    })),
    executionLog: [
      {
        id: 'exec-001',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        inputHash: 'a1b2c3d4',
        outputHash: 'x9y8z7w6',
        driftScore: 0.02,
        durationMs: 1250,
        error: null,
      },
      {
        id: 'exec-002',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        inputHash: 'e5f6g7h8',
        outputHash: 'u5v6w7x8',
        driftScore: 0.04,
        durationMs: 980,
        error: null,
      },
    ],
    approvalHistory: [
      {
        proposalId: 'prop-001',
        vote: 'approve',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        reason: 'Governance audit passed',
      },
    ],
    skillUsage: [
      { skill: 'code-review', count: 12, avgCost: 0.15, successRate: 0.98 },
      { skill: 'documentation', count: 8, avgCost: 0.08, successRate: 1.0 },
    ],
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * Health check endpoint
 */
app.get('/cic/health', (req, res) => {
  res.json(generateHealth());
});

/**
 * Pipelines endpoint
 */
app.get('/cic/pipelines', (req, res) => {
  res.json(generatePipelines());
});

/**
 * Alerts endpoint
 */
app.get('/cic/alerts', (req, res) => {
  res.json(generateAlerts());
});

/**
 * Workspace endpoint
 */
app.get('/cic/workspace', (req, res) => {
  res.json(generateWorkspace());
});

/**
 * CIC actions endpoint (accepts POST)
 */
app.post('/cic/actions', (req, res) => {
  const { action, debugMode, autoScale } = req.body;
  const actionMap = {
    'start-phase': 'Phase execution started',
    'pause': 'Pipeline paused',
    'resume': 'Pipeline resumed',
    'reset': 'Pipeline reset',
  };

  res.json({
    success: true,
    message: actionMap[action] || 'Action received',
  });
});

/**
 * Agents list endpoint
 */
app.get('/agents', (req, res) => {
  res.json(generateAgents());
});

/**
 * Agent detail endpoint
 */
app.get('/agents/:agentId', (req, res) => {
  res.json(generateAgentDetail(req.params.agentId));
});

/**
 * Agent invoke endpoint
 */
app.post('/agents/:agentId/invoke', (req, res) => {
  res.json({ success: true, message: `Agent ${req.params.agentId} invoked` });
});

/**
 * Agent pause endpoint
 */
app.post('/agents/:agentId/pause', (req, res) => {
  res.json({ success: true, message: `Agent ${req.params.agentId} paused` });
});

/**
 * Agent restart endpoint
 */
app.post('/agents/:agentId/restart', (req, res) => {
  res.json({ success: true, message: `Agent ${req.params.agentId} restarted` });
});

/**
 * Agent snapshot endpoint
 */
app.post('/agents/:agentId/snapshot', (req, res) => {
  res.json({ success: true, message: `Snapshot taken for ${req.params.agentId}` });
});

/**
 * Metrics endpoint (for legacy Metrics page)
 */
app.get('/cic/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    cpuPercent: 45 + Math.random() * 30,
    memoryPercent: 62 + Math.random() * 20,
    diskPercent: 58,
    networkIn: Math.floor(1000 + Math.random() * 500),
    networkOut: Math.floor(800 + Math.random() * 400),
    requestsPerSecond: Math.floor(120 + Math.random() * 80),
    errorRate: 0.02 + Math.random() * 0.05,
    avgLatencyMs: 85 + Math.random() * 40,
  });
});

/**
 * Flow execution endpoint (for legacy FlowExplorer page)
 */
app.post('/cic/flows', (req, res) => {
  res.json({
    execution_id: 'flow-' + Math.random().toString(36).substr(2, 9),
    status: 'started',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Flow execution detail endpoint
 */
app.get('/cic/flows/:executionId', (req, res) => {
  res.json({
    execution_id: req.params.executionId,
    status: 'running',
    progress: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check for the mock server itself
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Server startup ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎯 Mock API Server running on http://localhost:${PORT}`);
  console.log(`\n   Endpoints available:`);
  console.log(`   GET  /cic/health`);
  console.log(`   GET  /cic/pipelines`);
  console.log(`   GET  /cic/alerts`);
  console.log(`   GET  /cic/workspace`);
  console.log(`   GET  /cic/metrics`);
  console.log(`   POST /cic/actions`);
  console.log(`   GET  /agents`);
  console.log(`   GET  /agents/:id`);
  console.log(`   POST /agents/:id/invoke`);
  console.log(`   POST /agents/:id/pause`);
  console.log(`   POST /agents/:id/restart`);
  console.log(`   POST /agents/:id/snapshot`);
  console.log(`\n   Frontend proxy: /api → http://localhost:${PORT}\n`);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down mock server...');
  process.exit(0);
});
