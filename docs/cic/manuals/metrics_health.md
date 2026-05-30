# Operator Manual: Metrics & Health Subsystem

This document provides a comprehensive guide to the Metrics & Health subsystem, the observability layer for the Memos-Joplin ingestion pipeline.

## 1. Purpose

The primary purpose of this subsystem is to provide a **continuous, machine-readable and human-readable health surface** for the entire ingestion pipeline. It tracks key performance indicators (KPIs) and system vitals to enable automated monitoring, operator oversight, and rapid debugging.

## 2. Metrics Definitions

The following metrics are collected and calculated during each cycle.

### 2.1 Throughput
- **memos_1h**: The number of memos successfully processed in the last hour.
- **memos_24h**: The number of memos successfully processed in the last 24 hours.
- **tasks_24h**: The number of tasks created from memos in the last 24 hours.
- **ideas_24h**: The number of ideas clustered from memos in the last 24 hours.
- **digests_24h**: The number of daily digests generated in the last 24 hours.

### 2.2 Latency (in Milliseconds)
- **poll_cycle_ms**: The average time taken for a complete poll cycle (fetch, process, write).
- **task_extractor_ms**: The average time spent in the Task Extractor consumer.
- **idea_clusterer_ms**: The average time spent in the Idea Clusterer consumer.
- **digest_consumer_ms**: The average time spent in the Daily Digest consumer.
- **joplin_write_ms**: The average time taken for a write operation to the Joplin API.

## 3. Health Indicators

- **last_success**: The timestamp of the last successfully completed ingestion cycle.
- **last_error**: The timestamp of the last recorded error in the pipeline.
- **Consumers**: The status of each individual consumer (`OK`, `DEGRADED`, `NO_DATA`). A `DEGRADED` status means the consumer hasn't reported an event within its expected interval (typically 2x the normal run frequency).

## 4. Anomaly Detection

The system actively monitors for the following anomalies.

### 4.1 Ingestion Gap
- **Definition**: The number of minutes that have passed since the last `POLL_COMPLETE` event was recorded.
- **Interpretation**: A high value indicates that the core ingestion loop is not running. This could be due to a crash, a hung process, or a scheduling failure. It is the most critical indicator of a total system outage.

### 4.2 Memo Backlog
- **Definition**: The delta between the number of memos fetched from the source and the number of memos fully processed.
- **Interpretation**: A persistently positive and growing backlog indicates that the processing pipeline cannot keep up with the rate of new memos. This could point to a performance bottleneck in one of the consumers.

### 4.3 Cluster Drift
- **Definition**: A boolean flag indicating a significant change in the distribution of idea clusters.
- **Interpretation**: `true` suggests that the nature of the incoming data may be changing, causing the Idea Clusterer to create new notebooks at an unusual rate. This is not necessarily an error, but a signal for an operator to review the newly created idea clusters for relevance and organization.

## 5. How to Use Metrics During Debugging

1.  **Check `health.md` first**: This provides the quickest overview. Look for `DEGRADED` consumers or high `Ingestion Gap` values.
2.  **Examine `ingestion.json`**: For a more detailed, point-in-time snapshot, review the raw metrics file.
3.  **Correlate with Black Box Logs**: If an anomaly is detected, use the timestamp from the metrics report to find the corresponding events in the Black Box Recorder logs (`System/Events/...`). The detailed logs will provide the context needed to understand the root cause of the anomaly.

## 6. How to Extend Metrics

To add a new metric:
1.  **Collector**: Modify `src/metrics/collector.js` to extract the new raw data, likely from the event stream.
2.  **Analyzer**: Modify `src/metrics/analyzer.js` to transform the raw data into a calculated metric, placing it in the appropriate section (throughput, latency, etc.).
3.  **Writer**: Update `src/metrics/writer.js` to include the new metric in the `health.md` report. The `ingestion.json` file is updated automatically.
4.  **Test**: Add a test case to `tests/metrics.test.js` to validate the new metric's calculation.
