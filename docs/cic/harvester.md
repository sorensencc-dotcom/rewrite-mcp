# Harvester Integration

The **CIC Harvester** processes incoming data streams and extracts telemetry into structured formats. For the offline-first feedback loop, it extracts performance metrics from the gateway log file.

This document describes the client session extractor and harvester map registration.

---

## ⚡ Client Session Extractor

The extractor is defined in:

```
C:\dev\cic-ingestion\src\extractors\clientSessionExtractor.ts
```

It takes a raw log line parsed from `client_sessions.jsonl` and extracts the fields needed for drift calculation:

```typescript
export interface ClientSessionEntry {
  type: string;
  timestamp: number;
  backend: string;
  request: any;
  response: any;
}

export async function clientSessionExtractor(entry: ClientSessionEntry) {
  const { backend, response, timestamp } = entry;

  return {
    type: "client_session",
    backend,
    latency_ms: response?.meta?.latency_ms ?? null,
    tokens: response?.usage?.total_tokens ?? null,
    timestamp,
    driftSignals: {
      latency: response?.meta?.latency_ms,
      tokens: response?.usage?.total_tokens,
      backend,
    },
  };
}
```

### Extracted Signals:
*   `type`: Identifies the event as a `client_session`.
*   `backend`: The local runtime identifier (e.g. `ollama`).
*   `latency_ms`: Ingestion latency in milliseconds.
*   `tokens`: Total prompt and completion token count.
*   `driftSignals`: An isolated block containing the key inputs needed by the Drift Engine.

---

## 🗺️ Extractor Map Registration

The extractor is registered in the harvester registry at:

```
C:\dev\cic-ingestion\src\harvester\index.ts
```

```typescript
import { clientSessionExtractor } from "../extractors/clientSessionExtractor.js";

export const extractorMap: Record<string, Function> = {
  client_session: clientSessionExtractor,
};
```

This map allows the harvester orchestrator to route incoming jobs based on their `type`. When an ingestion job of type `"client_session"` is dequeued, the harvester calls the corresponding `clientSessionExtractor` to process each log entry.
