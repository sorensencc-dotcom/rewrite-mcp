const { getHealthSymbol, humanizeDuration } = require('./status');

function formatToHuman(data, health) {
    const { metrics, storage, dryRun, lastEvents } = data;
    const m = metrics || {};
    const t = m.throughput || {};
    const l = m.latency || {};
    const a = m.anomalies || {};
    const h = m.health || {};

    const lastPollEvent = (lastEvents || []).slice().reverse().find(e => e.event === 'POLL_COMPLETE');
    const lastPollTime = lastPollEvent ? humanizeDuration(lastPollEvent.timestamp) : 'never';
    
    const header = `CIC OPS STATUS — ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}`;
    
    const healthBlock = [
        'HEALTH',
        `  ${getHealthSymbol(h.consumers?.IngestionWorker || 'NO_DATA')} IngestionWorker: ${h.consumers?.IngestionWorker || 'NO_DATA'} (last poll ${lastPollTime})`,
        `  ${getHealthSymbol(h.consumers?.TaskExtractor)} TaskExtractor: ${h.consumers?.TaskExtractor || 'NO_DATA'}`,
        `  ${getHealthSymbol(h.consumers?.IdeaClusterer)} IdeaClusterer: ${h.consumers?.IdeaClusterer || 'NO_DATA'}`,
        `  ${getHealthSymbol(h.consumers?.DailyDigest)} DailyDigest: ${h.consumers?.DailyDigest || 'NO_DATA'}`,
        `  ${getHealthSymbol(health.overallStatus)} MetricsEngine: ${health.overallStatus}`, // Metrics engine health is the overall health
    ].join('
');

    const throughputBlock = [
        'THROUGHPUT (24h)',
        `  Memos: ${t.memos_24h || 0}`,
        `  Tasks: ${t.tasks_24h || 0}`,
        `  Ideas: ${t.ideas_24h || 0}`,
        `  Digests: ${t.digests_24h || 0}`,
    ].join('
');

    const latencyBlock = [
        'LATENCY',
        `  Poll Cycle: ${l.poll_cycle_ms || 0} ms`,
        `  TaskExtractor: ${l.task_extractor_ms || 0} ms`,
        `  IdeaClusterer: ${l.idea_clusterer_ms || 0} ms`,
        `  DigestConsumer: ${l.digest_consumer_ms || 0} ms`,
        `  Joplin Write: ${l.joplin_write_ms || 0} ms`,
    ].join('
');

    const anomaliesBlock = [
        'ANOMALIES',
        `  Ingestion Gap: ${a.ingestion_gap_minutes || 0} minutes`,
        `  Backlog: ${a.memo_backlog || 0}`,
        `  Cluster Drift: ${a.cluster_drift ? 'Yes' : 'No'}`,
    ].join('
');

    const storageBlock = [
        'STORAGE',
        `  Joplin: ${storage.joplin}`,
        `  Memos API: ${storage.memos}`,
    ].join('
');

    const modeBlock = [
        'MODE',
        `  Dry-Run: ${dryRun ? 'ON' : 'OFF'}`,
        `  Replay Engine: available`,
    ].join('
');

    return [
        header,
        healthBlock,
        throughputBlock,
        latencyBlock,
        anomaliesBlock,
        storageBlock,
        modeBlock,
    ].join('

');
}

function formatToJson(data, health) {
    return JSON.stringify({
        generatedAt: new Date().toISOString(),
        health,
        data,
    }, null, 2);
}

function formatToRaw(data) {
    return JSON.stringify(data.metrics, null, 2);
}


module.exports = {
    formatToHuman,
    formatToJson,
    formatToRaw,
};
