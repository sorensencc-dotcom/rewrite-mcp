# Operator Manual: Ops Console

This document provides a comprehensive guide to the `cic-ops` command-line interface (CLI), the primary tool for observing the health and status of the Memos-Joplin ingestion pipeline.

## 1. Purpose

The Ops Console provides a **single, deterministic, high-signal command** that surfaces the complete operational state of the ingestion system. It is the operator's cockpit view, designed for quick, at-a-glance health assessment without needing to inspect logs or notebooks directly.

## 2. Commands

### `cic-ops status`

This is the primary command. It fetches the latest metrics and state information and displays a formatted, human-readable status screen.

## 3. Flags

- `--json`: Outputs the full, aggregated status report (including health evaluation and raw data) in a machine-readable JSON format.
- `--raw`: Outputs the raw `ingestion.json` metrics file as retrieved from Joplin, without any additional formatting or analysis.

## 4. Exit Codes

The `cic-ops status` command uses exit codes to signal the system's health state, making it suitable for automated monitoring and scripting.

- **`0` (OK)**: The system is healthy. All consumers are reporting `OK`, and no anomalies are detected.
- **`1` (WARN/DEGRADED)**: The system is in a degraded state. This may be due to a minor anomaly (e.g., small backlog, minor ingestion gap) or a consumer reporting a `WARN` state. The system is still operational but requires attention.
- **`2` (ERROR/UNHEALTHY)**: The system is unhealthy. This is triggered by critical conditions, such as a consumer in an `ERROR` state, an ingestion gap over 30 minutes, unreachable storage dependencies, or a recently logged critical error.

## 5. How to Interpret Health

The `HEALTH` block provides the most critical information:

- **✓ (OK)**: The component is operating as expected.
- **! (WARN/DEGRADED)**: The component is experiencing a non-critical issue. For a consumer, this typically means it hasn't reported a heartbeat event within its expected interval.
- **✗ (ERROR)**: The component has reported a critical error or is non-functional.
- **? (NO_DATA)**: No health information is available for this component in the latest metrics report.

The `IngestionWorker` line also includes the time since the last successful poll, which is a key indicator of freshness.

## 6. How to Interpret Anomalies

- **Ingestion Gap**: The time since the last poll cycle completed. A value greater than the configured poll interval indicates the worker may be stuck or has crashed.
- **Backlog**: The number of memos fetched from the source that have not yet been fully processed. A consistently growing backlog indicates a performance bottleneck.
- **Cluster Drift**: Indicates if the `IdeaClusterer` is creating new topic notebooks at an unusual rate. This is not an error but a signal to review the new clusters.

## 7. How to Debug from Status Output

1.  **Start with `cic-ops status`**: Check the `HEALTH` block for any `!` or `✗` symbols and review the `ANOMALIES` block.
2.  **Check Storage**: Ensure both Joplin and the Memos API are `reachable`.
3.  **Use Timestamps**: If a component is degraded, use the timestamp from the main header and the "last poll" time to narrow down the search window in the Black Box logs (`System/Events/...`).
4.  **Drill Down with `--json`**: If the human-readable output is unclear, run with `--json` to see the raw data and health evaluation that produced the report. This can reveal more subtle issues.

## 8. How to Extend the Console

1.  **Loader**: To add a new data source, update `src/ops/loader.js` to fetch it.
2.  **Status**: To add a new health rule, update `src/ops/status.js` to include it in the `evaluateHealth` function.
3.  **Formatter**: To display the new data, update `src/ops/formatter.js` to add it to the human-readable output.
4.  **Test**: Add a test case to `tests/ops_status.test.js`.
