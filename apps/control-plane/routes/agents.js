const express = require('express');
const router = express.Router();

// Mock registry of core CIC agents
const agentRegistry = [
  { id: 'INGEST', role: 'Data Ingestion', status: 'ONLINE', latency_ms: 45 },
  { id: 'ENRICH', role: 'Context Enrichment', status: 'ONLINE', latency_ms: 120 },
  { id: 'ORCHESTRATE', role: 'Task Orchestration', status: 'ONLINE', latency_ms: 85 },
  { id: 'SYNTHESIZE', role: 'Output Synthesis', status: 'PENDING', latency_ms: 0 },
  { id: 'AUDIT', role: 'Quality Audit', status: 'ONLINE', latency_ms: 210 },
  { id: 'MCP', role: 'Model Context Protocol', status: 'ONLINE', latency_ms: 30 }
];

router.get('/', (req, res) => {
  // In a full implementation, this would ping real microservices or Qdrant
  res.json({ 
    timestamp: new Date().toISOString(),
    agents: agentRegistry 
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agents_total: agentRegistry.length,
    agents_online: agentRegistry.filter(a => a.status === 'ONLINE').length
  });
});

module.exports = router;
