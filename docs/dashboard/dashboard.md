# CIC Drift Dashboard

The **CIC Drift Dashboard** is the operator control console for the local AI routing fabric. It displays real-time performance metrics, drift scores, and gateway log records.

This document describes the dashboard layout, metrics displayed, and integration into the control plane.

---

## 🖥️ User Interface Overview

The dashboard is served locally at:

```
http://localhost:3119/dashboard
```

It is built as a single, high-fidelity static page using **modern glassmorphism design** principles:

*   **Color Palette**: Sleek dark slate background (`#0b0c10`) with radial violet and cyan glow.
*   **Frosted Glass Panels**: Cards utilize translucent backdrops (`backdrop-filter: blur(12px)`) and subtle borders to create depth.
*   **Visual Indicators**: Drift scores are displayed as progress bars that change color based on health (green $\rightarrow$ orange $\rightarrow$ red).
*   **Live Console**: Logs are rendered in a terminal-like container featuring color-coded tags for quick diagnosis.
*   **Auto-Refresh**: Automatically fetches metrics and updates the page every 2 seconds.

---

## 📊 Metrics Displayed

The dashboard aggregates and displays key telemetry metrics:

| Metric | UI Card | Description |
| :--- | :--- | :--- |
| **Total Logs Ingested** | Stats Banner | Count of all raw client log turns parsed from `client_sessions.jsonl`. |
| **Average Latency** | Stats Banner | Computed average response time of the last 10 inference calls. |
| **Critical Drift Alerts** | Stats Banner | Count of active backends whose drift score exceeds the `0.7` bypass threshold. |
| **Last Activity** | Stats Banner | Timestamp of the most recent ingested client interaction. |
| **Drift Lineage** | Center Grid (Left) | Interactive list of backends showing active drift scores and bypass status. |
| **Inference Gateway Log** | Center Grid (Right) | Tabular view of recent gateway queries with status, backend, latency, and tokens. |
| **Event Stream** | Bottom Banner | Real-time console log output showing full trace payloads of client turns. |

---

## 🔌 Metrics API Endpoint (`/metrics`)

The dashboard is powered by the `/metrics` API route in `adapterGatewayAPI.ts`:

```typescript
app.get("/metrics", (_req, res) => {
  const logsDir = path.join(process.cwd(), "cic-ingestion", "logs");
  const file = path.join(logsDir, "client_sessions.jsonl");

  let recent = [];
  try {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf8").trim().split("\n");
      recent = lines.filter(Boolean).slice(-50).map(line => JSON.parse(line));
    }
  } catch (err: any) {
    console.error("[adapter-gateway] /metrics log read error:", err.message);
  }

  res.json({
    drift: cicState.drift,
    recent,
    timestamp: Date.now(),
  });
});
```

*   **Log Slicing**: To optimize memory usage, only the **last 50 logs** are read and sent to the client.
*   **Stateless Retrieval**: Reads the in-memory `cicState.drift` directly, eliminating database roundtrips.
