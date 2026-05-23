const JoplinClient = require('../joplin/client');
const { isDryRun } = require('../utils/dry-run');

const METRICS_JSON_PATH = 'System/Metrics/ingestion.json';
const HEALTH_MD_PATH = 'System/Metrics/health.md';

class MetricsWriter {
  constructor(joplinClient) {
    this.joplinClient = joplinClient;
  }

  async write(metrics) {
    console.log('MetricsWriter: Writing metrics...');
    try {
      await this.writeJsonMetrics(metrics);
      await this.writeMarkdownHealthReport(metrics);
      console.log('MetricsWriter: Metrics written successfully.');
    } catch (error) {
      console.error('MetricsWriter: Failed to write metrics.', error);
      // Never throw
    }
  }

  async writeJsonMetrics(metrics) {
    const content = JSON.stringify(metrics, null, 2);
    if (isDryRun()) {
      console.log(`DRY RUN: Would write to ${METRICS_JSON_PATH}:
${content}`);
      return;
    }
    const note = await this.joplinClient.getOrCreateNote(METRICS_JSON_PATH, 'Metrics Data');
    await this.joplinClient.updateNote(note.id, content, 'Metrics Data');
  }

  async writeMarkdownHealthReport(metrics) {
    const { timestamp, throughput, latency, health, anomalies } = metrics;
    const readableTimestamp = new Date(timestamp).toUTCString().replace(' GMT', ' UTC');

    const content = `
# Ingestion Health — ${readableTimestamp}

## Throughput (24h)
- Memos: ${throughput.memos_24h}
- Tasks: ${throughput.tasks_24h}
- Ideas: ${throughput.ideas_24h}
- Digests: ${throughput.digests_24h}

## Latency
- Poll Cycle: ${latency.poll_cycle_ms} ms
- TaskExtractor: ${latency.task_extractor_ms} ms
- IdeaClusterer: ${latency.idea_clusterer_ms} ms
- DigestConsumer: ${latency.digest_consumer_ms} ms
- Joplin Write: ${latency.joplin_write_ms} ms

## Health
- Last Success: ${health.last_success || 'None'}
- Last Error: ${health.last_error || 'None'}
- Consumers:
  - Mirroring: ${health.consumers.Mirroring}
  - TaskExtractor: ${health.consumers.TaskExtractor}
  - IdeaClusterer: ${health.consumers.IdeaClusterer}
  - DailyDigest: ${health.consumers.DailyDigest}

## Anomalies
- Ingestion Gap: ${anomalies.ingestion_gap_minutes} minutes
- Memo Backlog: ${anomalies.memo_backlog}
- Cluster Drift: ${anomalies.cluster_drift ? 'Yes' : 'No'}

---
Generated automatically by CIC Metrics Engine.
    `.trim();

    if (isDryRun()) {
      console.log(`DRY RUN: Would write to ${HEALTH_MD_PATH}:
${content}`);
      return;
    }

    const note = await this.joplinClient.getOrCreateNote(HEALTH_MD_PATH, 'Health Report');
    await this.joplinClient.updateNote(note.id, content, 'Health Report');
  }
}

module.exports = MetricsWriter;
