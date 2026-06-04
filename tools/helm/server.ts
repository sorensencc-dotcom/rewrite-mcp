/**
 * Helm Dashboard Server — Tier 3 Web UI
 *
 * Serves the web dashboard at http://localhost:3847/helm
 */

import http from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  helmToday,
  helmTrends,
  helmRoutingStatus,
  tools as helmTools,
} from "./helm-server";

const PORT = 3847;
const HOST = "localhost";

// Read dashboard HTML
const dashboardPath = join(__dirname, "dashboard.html");
const dashboardHtml = existsSync(dashboardPath)
  ? readFileSync(dashboardPath, "utf8")
  : "<h1>Dashboard HTML not found</h1>";

// ============================================================
// HTTP Server
// ============================================================

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Routes
  if (pathname === "/" || pathname === "/helm") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(dashboardHtml);
    return;
  }

  if (pathname === "/api/helm/today") {
    const data = helmToday();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (pathname === "/api/helm/trends") {
    const data = helmTrends();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (pathname === "/api/helm/routing") {
    const data = helmRoutingStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (pathname === "/api/helm/tools") {
    const toolList = Object.entries(helmTools).map(([name, tool]) => ({
      name,
      description: (tool as any).description,
    }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(toolList, null, 2));
    return;
  }

  // Health check
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ============================================================
// Start Server
// ============================================================

server.listen(PORT, HOST, () => {
  console.log(`🎯 Helm Dashboard Server`);
  console.log(`📊 http://${HOST}:${PORT}/helm`);
  console.log(`📡 API: http://${HOST}:${PORT}/api/helm/...`);
  console.log(`❤️  Health: http://${HOST}:${PORT}/health`);
  console.log();
  console.log(`Serving cost intelligence dashboard.`);
  console.log(`Press Ctrl+C to stop.`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use. Try another port or kill the process.`);
    process.exit(1);
  } else {
    throw err;
  }
});
