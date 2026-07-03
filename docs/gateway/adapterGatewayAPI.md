# Unified Adapter Gateway API

The **Unified Adapter Gateway API** is a high-performance Express server running on port `3119` that serves as the entry point for all model requests.

This document describes the API endpoints, internal routing mechanism, logging engine, and CORS settings of the gateway.

---

## ⚡ API Endpoints

The gateway exposes two sets of endpoints: the **Unified OpenAI-Compatible Endpoints** and the **UX Client Endpoints**.

### 1. Unified Endpoints
*   `POST /v1/chat`: Receives chat requests, runs the MAAL routing policy to choose the best backend, dispatches the request to the corresponding provider wrapper, and logs the result.
*   `POST /v1/completion`: Simulates a legacy completion endpoint by converting simple text prompts into chat messages and routing them.
*   `POST /v1/embed`: (Stub) Exposes the interface for generating vector embeddings.
*   `POST /v1/rag/query`: Exposes RAG capabilities, routing requests directly to the AnythingLLM provider.
*   `GET /v1/models`: Returns a static list of registered model backends.
*   `GET /v1/health`: Performs a quick health check of the gateway.

### 2. Client Endpoints (UX Front-ends)
*   `POST /client/send`: Normalizes incoming requests from Jan, Msty, or LM Studio, routes them, and returns responses.
*   `POST /client/session`: Logs session configuration data to `client_sessions.jsonl`.
*   `POST /client/logs`: Accepts custom diagnostic logs from clients and logs them for auditing.

---

## 🚦 Internal Routing Mechanism

```typescript
app.post("/v1/chat", async (req, res) => {
  const unifiedReq: UnifiedChatRequest = {
    model: req.body.model,
    messages: req.body.messages,
    context: req.body.context ?? { source: "direct" },
    routing: req.body.routing ?? { slo: {} },
    tools: req.body.tools ?? [],
  };

  try {
    // 1. Resolve backend using MAAL Routing Policy
    const backend = route(unifiedReq, cicState);

    // 2. Dispatch to the selected provider
    const response = await dispatchToBackend(backend, unifiedReq);

    // 3. Log results to local JSONL
    appendClientLog({
      type: "chat_turn",
      timestamp: Date.now(),
      backend,
      request: unifiedReq,
      response,
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: "adapter_gateway_chat_error" });
  }
});
```

---

## 🔒 Security, CORS & Logging

### 1. Lightweight CORS Middleware
To enable integration with desktop LLM runtimes and web interfaces, a wildcard CORS policy is implemented:
```typescript
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
```

### 2. Atomic Synchronous Logging
To prevent logs from overlapping or being corrupted during concurrent requests, all file append operations use the synchronous `fs.appendFileSync`:
```typescript
function appendClientLog(entry: unknown) {
  try {
    const logsDir = ensureLogsDir();
    const file = path.join(logsDir, "client_sessions.jsonl");
    const line = JSON.stringify(entry);
    fs.appendFileSync(file, line + "\n");
  } catch (err: any) {
    console.error("[adapter-gateway] failed to write client log:", err.message);
  }
}
```
This guarantees atomicity on the filesystem without relying on a lock manager or external database.
