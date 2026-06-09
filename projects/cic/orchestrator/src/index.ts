import http from 'http';

const port = parseInt(process.env.CIC_ORCHESTRATOR_PORT || '7001', 10);
const nimBaseUrl = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const nimApiKey = process.env.NIM_API_KEY;

const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'cic-orchestrator' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`CIC Orchestrator listening on port ${port}`);
  console.log(`NIM Base URL: ${nimBaseUrl}`);
  console.log(`API Key configured: ${nimApiKey ? 'yes' : 'no'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
