# Log Ingestion Pipeline

The Ingestion Pipeline is the bridge between the live gateway server and the offline drift state. It reads, parses, extracts, and folds client logs back into the system memory.

This document describes the offline-first log structure, the Harvester Bridge resolver, and the event extraction pipeline.

---

## 💾 Log File Structure

Client logs are saved locally to a JSON Lines (JSONL) file located at:

```
C:\dev\rewrite-mcp\castironforge\cic-ingestion\logs\client_sessions.jsonl
```

Each line is a self-contained JSON object containing:

```json
{
  "type": "chat_turn",
  "timestamp": 1782754690000,
  "backend": "ollama",
  "request": {
    "model": "llama3",
    "messages": [{"role": "user", "content": "hi"}]
  },
  "response": {
    "id": "chat-123",
    "model": "llama3",
    "created": 1782754690000,
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 5,
      "total_tokens": 15
    },
    "output": {
      "text": "Hello! How can I help you today?"
    },
    "meta": {
      "backend": "ollama",
      "latency_ms": 450,
      "offline": true,
      "source": "direct"
    }
  }
}
```

This format is chosen for **durability** and **performance**:
*   **Append-Only**: Adding logs does not require reading or rewriting the file.
*   **Crash-Resilient**: Corruption of one line does not invalidate other lines.
*   **Low Memory Footprint**: Logs can be streamed or parsed line-by-line.

---

## 🌉 Harvester Bridge & Resolver

The Harvester Bridge reads the local log files and parses them into javascript objects.

```
+------------------+     +--------------------+     +---------------------+
| Ingestion Queue  | --> | Bridge Resolver    | --> | File Reader (UTF-8) |
| (client_session) |     | (resolveJob)       |     | (client_sessions)   |
+------------------+     +--------------------+     +---------------------+
                                                               |
                                                               v
                                                    +---------------------+
                                                    |  Split by Newlines  |
                                                    |  JSON.parse Lines   |
                                                    +---------------------+
```

1.  **Queue Dispatch**: An ingestion job of type `client_session` is enqueued in the `IngestionQueue`.
2.  **File Resolution**: The `resolveJob` helper in `resolver.ts` translates the job payload path to an absolute system path.
3.  **Read Operations**: The file is read using `fs.readFileSync(file, 'utf8')`.
4.  **Parsing**: The file contents are split by `\n`, empty lines are filtered, and each line is parsed via `JSON.parse()`.

---

## ⚡ Extraction & State Folding

Once resolved, raw entries are transformed and ingested into `cicState`:

```typescript
// 1. Extraction (clientSessionExtractor.ts)
const rawEntry = { backend: "ollama", response: { ... }, timestamp: 1782754690000 };
const event = await clientSessionExtractor(rawEntry);
// Result:
// {
//   type: "client_session",
//   backend: "ollama",
//   latency_ms: 450,
//   tokens: 15,
//   timestamp: 1782754690000,
//   driftSignals: { latency: 450, tokens: 15, backend: "ollama" }
// }

// 2. Folding (replayHarness.ts)
processClientSession(event, cicState); // updates cicState.drift
```

*   **Extraction**: Normalizes raw gateway formats into standard CIC drift schemas.
*   **Folding**: Applies the drift engine formulas to update the drift scores of the specific backend inside `cicState.drift`, which the MAAL router checks for the next inference call.
