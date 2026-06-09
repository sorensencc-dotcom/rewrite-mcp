import http from 'http';

const port = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'TheFoundry App', version: '1.0.0' }));
  }
});

server.listen(port, () => {
  console.log(`[TheFoundry] App listening on port ${port}`);
});
