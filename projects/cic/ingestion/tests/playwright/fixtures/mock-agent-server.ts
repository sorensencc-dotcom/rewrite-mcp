// fixtures/mock-agent-server.ts
import http from 'http';

export function startMockAgentServer(port = 9000) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      latency_ms: 42,
      timestamp: new Date().toISOString()
    }));
  });

  server.listen(port);
  return server;
}
