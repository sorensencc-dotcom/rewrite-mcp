import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4310;

// In-memory telemetry storage
const telemetryData = {
  events: [],
  metrics: {
    total_prompts: 0,
    avg_latency_ms: 0,
    completion_rate: 0.95,
    error_rate: 0.02,
  },
  agents: {
    claude: { status: 'online', uptime_seconds: 0 },
    copilot: { status: 'online', uptime_seconds: 0 },
    gemini: { status: 'online', uptime_seconds: 0 },
  }
};

const startTime = Date.now();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime_ms: Date.now() - startTime,
    timestamp: new Date().toISOString()
  });
});

// Get metrics
app.get('/metrics', (req, res) => {
  telemetryData.metrics.total_prompts += Math.floor(Math.random() * 5);
  telemetryData.metrics.avg_latency_ms = 150 + Math.random() * 50;
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    metrics: telemetryData.metrics,
    agents: telemetryData.agents
  });
});

// Get recent events
app.get('/events', (req, res) => {
  res.json({
    total: telemetryData.events.length,
    recent: telemetryData.events.slice(-10),
    timestamp: new Date().toISOString()
  });
});

// Log event
app.post('/event', (req, res) => {
  const { type, agent, duration_ms, status } = req.body;
  
  if (!type || !agent) {
    return res.status(400).json({ error: 'Missing type or agent' });
  }

  const event = {
    id: telemetryData.events.length + 1,
    type,
    agent,
    duration_ms: duration_ms || 0,
    status: status || 'success',
    timestamp: new Date().toISOString()
  };

  telemetryData.events.push(event);
  if (telemetryData.events.length > 1000) {
    telemetryData.events.shift();
  }

  res.json({ ok: true, event_id: event.id });
});

// Agent status
app.get('/agents', (req, res) => {
  res.json({
    agents: telemetryData.agents,
    timestamp: new Date().toISOString()
  });
});

// Update agent status
app.post('/agents/:agent/status', (req, res) => {
  const { agent } = req.params;
  const { status } = req.body;

  if (!telemetryData.agents[agent]) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  telemetryData.agents[agent].status = status || 'online';
  telemetryData.agents[agent].uptime_seconds = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    ok: true,
    agent,
    status: telemetryData.agents[agent].status
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Telemetry Service listening on http://localhost:${PORT}`);
  console.log(`✓ Metrics: http://localhost:${PORT}/metrics`);
  console.log(`✓ Health: http://localhost:${PORT}/health`);
});
