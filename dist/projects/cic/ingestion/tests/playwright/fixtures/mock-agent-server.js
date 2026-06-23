"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMockAgentServer = startMockAgentServer;
// fixtures/mock-agent-server.ts
const http_1 = __importDefault(require("http"));
function startMockAgentServer(port = 9000) {
    const server = http_1.default.createServer((req, res) => {
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
//# sourceMappingURL=mock-agent-server.js.map