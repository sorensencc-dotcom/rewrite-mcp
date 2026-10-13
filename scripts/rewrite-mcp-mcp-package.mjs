import { toNodeHandler } from "@modelcontextprotocol/node";
import { handler, mountedFetch } from "./rewrite-mcp-http-entry.mjs";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MODERN = "2026-07-28";
const HANDSHAKE = "2025-11-25";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function envelope(version) {
  return {
    "io.modelcontextprotocol/protocolVersion": version,
    "io.modelcontextprotocol/clientInfo": { name: "rewrite-mcp-mcp-package", version: "0.0.0" },
    "io.modelcontextprotocol/clientCapabilities": {},
  };
}

function buildRequest({
  method = "POST",
  rpcMethod,
  params,
  version,
  mcpMethod,
  mcpName,
  accept,
  origin,
  session,
  omitAccept = false,
  setName = false,
}) {
  const headers = new Headers();
  if (!omitAccept) headers.set("accept", accept === undefined ? "application/json, text/event-stream" : accept);
  headers.set("content-type", "application/json");
  if (version) headers.set("mcp-protocol-version", version);
  if (mcpMethod !== undefined) headers.set("mcp-method", mcpMethod);
  else if (rpcMethod) headers.set("mcp-method", rpcMethod);
  if (setName) headers.set("mcp-name", mcpName);
  if (origin) headers.set("origin", origin);
  if (session) headers.set("mcp-session-id", session);
  const init = { method, headers };
  if (method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: rpcMethod, params });
  }
  return new Request("http://127.0.0.1/mcp", init);
}

async function readBody(response) {
  const text = await response.text();
  const type = response.headers.get("content-type") || "";
  let json = null;
  if (type.includes("application/json")) json = text ? JSON.parse(text) : null;
  else if (type.includes("text/event-stream")) {
    const data = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    const last = data.at(-1);
    json = last ? JSON.parse(last) : null;
  }
  return {
    status: response.status,
    type,
    text,
    json,
    allow: response.headers.has("allow") ? response.headers.get("allow") : null,
  };
}

const failures = [];
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failures.push(`${name}: ${detail}`);
}

function assertPackageSurface() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  check(
    "package @modelcontextprotocol/server",
    deps["@modelcontextprotocol/server"] === "2.3.1",
    `version=${deps["@modelcontextprotocol/server"] || "missing"}`,
  );
  check(
    "package @modelcontextprotocol/node",
    deps["@modelcontextprotocol/node"] === "2.1.1",
    `version=${deps["@modelcontextprotocol/node"] || "missing"}`,
  );
  const entryPath = path.join(ROOT, "scripts", "rewrite-mcp-http-entry.mjs");
  const source = fs.readFileSync(entryPath, "utf8");
  check(
    "source imports createMcpHandler",
    source.includes('from "@modelcontextprotocol/server"') && source.includes("createMcpHandler") && source.includes("originValidationResponse"),
    "scripts/rewrite-mcp-http-entry.mjs",
  );
  const serverEntry = /@modelcontextprotocol\/sdk\/server(?:\/|['"])/;
  const hits = [];
  const skip = new Set(["node_modules", "dist", ".git", "coverage", "toolforge"]);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(mjs|cjs|js|ts|tsx)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (serverEntry.test(text)) hits.push(path.relative(ROOT, full));
    }
  }
  walk(ROOT);
  if (deps["@modelcontextprotocol/sdk"] || hits.length) {
    console.log(`NOTE\troot package.json still depends on @modelcontextprotocol/sdk=${deps["@modelcontextprotocol/sdk"] || "no"}`);
    console.log(`NOTE\tsdk server-entry imports\t${hits.length}`);
    for (const hit of hits) console.log(`NOTE\t${hit}`);
  }
}

const discoverParams = { _meta: envelope(MODERN) };
const toolParams = {
  name: "search_kb",
  arguments: { query: "stateless transport" },
  _meta: envelope(MODERN),
};

assertPackageSurface();

{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
  })));
  const result = body.json?.result;
  check(
    "shared discover",
    body.status === 200 && result?.resultType === "complete" && result?.supportedVersions?.includes(MODERN),
    JSON.stringify({ status: body.status, resultType: result?.resultType, versions: result?.supportedVersions }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "tools/call",
    params: toolParams,
    version: MODERN,
    mcpName: "search_kb",
    setName: true,
  })));
  check(
    "shared tools/call",
    body.status === 200 && Boolean(body.json?.result?.resultType),
    JSON.stringify({ status: body.status, resultType: body.json?.result?.resultType }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    mcpMethod: "tools/list",
  })));
  check(
    "shared method disagree",
    body.status === 400 && body.json?.error?.code === -32020,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: { _meta: envelope(HANDSHAKE) },
    version: MODERN,
  })));
  check(
    "shared meta version disagree",
    body.status === 400 && body.json?.error?.code === -32020,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: { _meta: envelope("1900-01-01") },
    version: "1900-01-01",
  })));
  const data = body.json?.error?.data;
  check(
    "shared unknown version",
    body.status === 400 && body.json?.error?.code === -32022 && data && Object.hasOwn(data, "supported") && Object.hasOwn(data, "requested"),
    JSON.stringify({ status: body.status, code: body.json?.error?.code, data }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "tools/call",
    params: { name: "search_kb", arguments: { query: "x" }, _meta: envelope(MODERN) },
    version: MODERN,
  })));
  check(
    "shared missing Mcp-Name",
    body.status === 400 && body.json?.error?.code === -32020,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    mcpName: "search_kb",
    setName: true,
  })));
  check(
    "shared extra Mcp-Name",
    body.status === 200,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "nope/nope",
    params: { _meta: envelope(MODERN) },
    version: MODERN,
  })));
  check(
    "shared unknown method",
    body.status === 404 && body.json?.error?.code === -32601,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
  })));
  check(
    "shared no origin",
    body.status === 200,
    JSON.stringify({ status: body.status }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    session: "sess-1",
  })));
  check(
    "shared session ignored",
    body.status === 200,
    JSON.stringify({ status: body.status, code: body.json?.error?.code }),
  );
}

for (const accept of ["application/json", "text/event-stream", "text/plain"]) {
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    accept,
  })));
  check(
    `handler accept ${accept}`,
    body.status === 200 && body.type.includes("application/json"),
    JSON.stringify({ status: body.status, type: body.type }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    omitAccept: true,
  })));
  check(
    "handler accept absent",
    body.status === 200 && body.type.includes("application/json"),
    JSON.stringify({ status: body.status, type: body.type }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
    origin: "https://evil.example",
  })));
  check(
    "handler evil origin",
    body.status === 403 && body.json?.error?.code === -32000 && body.json?.error?.message === "Invalid Origin: evil.example",
    JSON.stringify({ status: body.status, code: body.json?.error?.code, message: body.json?.error?.message }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: discoverParams,
    version: MODERN,
  })));
  check(
    "handler no origin stands",
    body.status === 200 && body.json?.result?.resultType === "complete",
    JSON.stringify({ status: body.status }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "server/discover",
    params: { _meta: envelope(MODERN) },
    version: HANDSHAKE,
  })));
  check(
    "handler handshake plus modern meta",
    body.status === 400 && body.json?.error?.code === -32022 && body.json?.error?.data?.requested === HANDSHAKE,
    JSON.stringify({ status: body.status, code: body.json?.error?.code, requested: body.json?.error?.data?.requested }),
  );
}
{
  const params = {
    protocolVersion: HANDSHAKE,
    capabilities: {},
    clientInfo: { name: "codex", version: "0.0.0" },
  };
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "initialize",
    params,
    version: HANDSHAKE,
    accept: "application/json, text/event-stream",
  })));
  check(
    "handler initialize",
    body.status === 400 && body.json?.error?.code === -32022 && body.json?.id === null && body.json?.error?.data?.supported?.includes(MODERN) && body.json?.error?.data?.requested === HANDSHAKE && body.json?.result === undefined,
    JSON.stringify({ status: body.status, code: body.json?.error?.code, supported: body.json?.error?.data?.supported, requested: body.json?.error?.data?.requested }),
  );
}
for (const version of [undefined, MODERN]) {
  const body = await readBody(await mountedFetch(buildRequest({ method: "GET", version })));
  check(
    `handler GET ${version || "none"}`,
    body.status === 405 && body.text === "" && body.allow === "POST",
    JSON.stringify({ status: body.status, type: body.type, code: body.json?.error?.code, message: body.json?.error?.message, allow: body.allow }),
  );
}
{
  const body = await readBody(await mountedFetch(buildRequest({ method: "DELETE" })));
  check(
    "handler DELETE",
    body.status === 405 && body.type.includes("application/json") && body.json?.error?.code === -32000,
    JSON.stringify({ status: body.status, type: body.type, code: body.json?.error?.code }),
  );
}
{
  const params = {
    protocolVersion: HANDSHAKE,
    capabilities: {},
    clientInfo: { name: "codex", version: "0.0.0" },
  };
  const body = await readBody(await mountedFetch(buildRequest({
    rpcMethod: "initialize",
    params,
    version: HANDSHAKE,
    origin: "https://evil.example",
    accept: "application/json, text/event-stream",
  })));
  check(
    "handler legacy initialize evil origin",
    body.status === 400 && body.json?.error?.code === -32022 && body.json?.error?.data?.supported?.includes(MODERN) && body.json?.error?.data?.requested === HANDSHAKE,
    JSON.stringify({ status: body.status, code: body.json?.error?.code, requested: body.json?.error?.data?.requested }),
  );
}

function pythonBin() {
  for (const bin of ["python", "python3"]) {
    const probe = spawnSync(bin, ["-c", "import http.client"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

const nodeHandler = toNodeHandler({ fetch: mountedFetch });
const server = http.createServer((req, res) => {
  nodeHandler(req, res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const py = pythonBin();
if (!py) {
  check("handler body over 4MiB socket", false, "python http.client is not available");
} else {
  const script = `
import http.client
conn = http.client.HTTPConnection("127.0.0.1", ${port}, timeout=60)
body = b"a" * 4194305
conn.putrequest("POST", "/mcp")
conn.putheader("Content-Type", "application/json")
conn.putheader("Content-Length", "4194305")
conn.putheader("Accept", "application/json, text/event-stream")
conn.putheader("MCP-Protocol-Version", "${MODERN}")
conn.putheader("Mcp-Method", "server/discover")
conn.endheaders()
conn.send(body)
resp = conn.getresponse()
data = resp.read().decode()
print(resp.status)
print(resp.getheader("content-type") or "")
print(data)
`;
  const stdout = [];
  const stderr = [];
  const child = spawn(py, ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const code = await new Promise((resolve) => child.on("close", resolve));
  const lines = Buffer.concat(stdout).toString("utf8").trim().split(/\r?\n/);
  const status = Number(lines[0]);
  const type = lines[1] || "";
  const text = lines.slice(2).join("\n");
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  check(
    "handler body over 4MiB socket",
    code === 0 && status === 413 && type.includes("application/json") && parsed?.error?.code === -32000 && String(parsed?.error?.message || "").includes("4194304"),
    JSON.stringify({
      status,
      type,
      code: parsed?.error?.code,
      message: parsed?.error?.message,
      stderr: Buffer.concat(stderr).toString("utf8").slice(0, 300),
    }),
  );
}

await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
await new Promise((resolve) => {
  const socket = net.connect(port, "127.0.0.1");
  socket.on("connect", () => {
    socket.end();
    check("listener stopped", false, `port ${port} still accepts connections`);
    resolve();
  });
  socket.on("error", () => {
    check("listener stopped", true, `127.0.0.1:${port} refused`);
    resolve();
  });
});
await handler.close();

if (failures.length) {
  console.log(`FAILED ${failures.length}`);
  process.exit(1);
}
console.log("ALL PASS");
