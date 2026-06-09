const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const METRICS_FILE = '/app/metrics-collected.json';

const metrics = [];

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/metrics' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        metrics.push({
          ...event,
          receivedAt: new Date().toISOString(),
        });

        console.log(`\n📊 Telemetry Event Received:`);
        console.log(`   Event: ${event.event}`);
        console.log(`   Tenant: ${event.tenantId}`);
        console.log(`   Repo: ${event.repoId}`);
        console.log(`   Framework: ${event.framework}`);
        console.log(`   Tokens: ${event.totalTokens}`);
        console.log(`   Compressed: ${event.compressedTokens}`);
        const reduction = ((1 - event.compressedTokens / event.totalTokens) * 100).toFixed(1);
        console.log(`   Reduction: ${reduction}%`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true, id: metrics.length }));
      } catch (err) {
        console.error('Invalid telemetry payload:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.url === '/metrics-dashboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const summary = {
      totalEvents: metrics.length,
      events: metrics,
      summary: {
        totalTokens: metrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0),
        totalCompressed: metrics.reduce((sum, m) => sum + (m.compressedTokens || 0), 0),
        byFramework: {},
        byTenant: {},
      },
    };

    // Aggregate by framework and tenant
    metrics.forEach((m) => {
      const framework = m.framework || 'unknown';
      const tenant = m.tenantId || 'unknown';

      summary.summary.byFramework[framework] = (summary.summary.byFramework[framework] || 0) + 1;
      summary.summary.byTenant[tenant] = (summary.summary.byTenant[tenant] || 0) + 1;
    });

    res.end(JSON.stringify(summary, null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`\n🎯 CodeBurn Mock Service listening on port ${PORT}`);
  console.log('   POST /metrics — Receive telemetry events');
  console.log('   GET /metrics-dashboard — View collected metrics');
  console.log('   GET /health — Health check\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📝 Saving metrics...');
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  console.log(`✅ Metrics saved to ${METRICS_FILE}`);
  server.close(() => process.exit(0));
});
