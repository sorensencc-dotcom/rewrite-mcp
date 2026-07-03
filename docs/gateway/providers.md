# Provider Wrappers

The system integrates six local AI backend runtimes. Each runtime is represented by a dedicated provider file under `src/providers/`.

This document describes the structure, timeout constraints, and fallback mock behavior of the provider wrappers.

---

## 🛠️ Integrated Providers

The following providers are fully implemented:

*   **Ollama (`ollamaProvider.ts`)**: Connects to the local Ollama API on port `11434` at `/api/chat`.
*   **Llamafile (`llamafileProvider.ts`)**: Connects to the single-binary llamafile server on port `8080` at `/chat/completions`.
*   **Koboldcpp (`koboldcppProvider.ts`)**: Connects to the Koboldcpp runtime on port `5001` at `/chat/completions`.
*   **LocalAI (`localaiProvider.ts`)**: Connects to the LocalAI server on port `8080` at `/chat/completions`.
*   **GPT4All (`gpt4allProvider.ts`)**: Connects to the GPT4All server on port `4891` at `/chat/completions`.
*   **AnythingLLM (`anythingllmProvider.ts`)**: Connects to the local AnythingLLM knowledge base on port `3001` at `/workspace/query` to perform RAG.

---

## ⏱️ Timeout Control (AbortController)

To prevent hanging connections from locking up the system, all fetch-based provider wrappers implement a **30-second timeout** using an `AbortController`.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const res = await fetch(`${API_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  // Parse response...
} finally {
  clearTimeout(timeoutId); // Prevent memory leak
}
```

---

## 🎭 Robust Mock Fallback Behavior

If a local backend runtime is not active (e.g. the user has not started Koboldcpp or AnythingLLM), the provider wrapper catches the network error and returns a **Structured Mock Fallback** instead of throwing an unhandled exception:

```typescript
} catch (err: any) {
  const text = `[Ollama Mock Output for: ${userMessage}]`;
  return {
    id: `ollama-mock-${Date.now()}`,
    model: req.model || "ollama",
    created: Date.now(),
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    output: {
      text,
      messages: [{ role: "assistant", content: text }],
    },
    meta: {
      backend: "ollama",
      latency_ms: Date.now() - start, // Keeps track of how long the attempt took
      offline: true,
      source: req.context?.source ?? "direct",
    },
  };
}
```

### Why Mocks are Essential:
1.  **Prevents Cascading Failures**: Endpoints continue returning valid JSON schemas even when local servers are offline.
2.  **Supports Ingestion Testing**: The mock response records a valid `latency_ms` and `usage.total_tokens` profile, allowing the drift engine to ingest, calculate degradation, and prune the backend normally.
3.  **Local-First Resilience**: Ensures developers can run and test the complete system offline without requiring the actual heavy runtimes to be running on their machines.
