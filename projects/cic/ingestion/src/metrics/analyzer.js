const _ = require('lodash');

class MetricsAnalyzer {
  constructor() {}

  analyze(rawMetrics) {
    console.log('MetricsAnalyzer: Analyzing raw metrics...');
    const { memos, tasks, ideas, digests, timings, lastSuccess, lastError, pollCompleteEvents, events } = rawMetrics;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const memos_1h = memos.filter(m => new Date(m.timestamp) > oneHourAgo).length;

    const throughput = {
      memos_1h: memos_1h,
      memos_24h: memos.length,
      tasks_24h: tasks.length,
      ideas_24h: ideas.length,
      digests_24h: digests.length,
    };

    const latency = {
        poll_cycle_ms: timings.poll_cycle_ms || 0,
        task_extractor_ms: timings.task_extractor_ms || 0,
        idea_clusterer_ms: timings.idea_clusterer_ms || 0,
        digest_consumer_ms: timings.digest_consumer_ms || 0,
        joplin_write_ms: timings.joplin_write_ms || 0,
    };

    const health = {
      last_success: lastSuccess || null,
      last_error: lastError || null,
      consumers: {
        Mirroring: this.getConsumerHealth(events, 'MirroringConsumer', 2),
        TaskExtractor: this.getConsumerHealth(events, 'TaskExtractor', 2),
        IdeaClusterer: this.getConsumerHealth(events, 'IdeaClusterer', 2),
        DailyDigest: this.getConsumerHealth(events, 'DigestConsumer', 24 * 2), // 2x per day expected
      },
    };

    const anomalies = {
      ingestion_gap_minutes: this.calculateIngestionGap(pollCompleteEvents),
      memo_backlog: this.calculateMemoBacklog(events),
      cluster_drift: this.detectClusterDrift(ideas),
    };

    const metrics = {
      timestamp: new Date().toISOString(),
      throughput,
      latency,
      health,
      anomalies,
    };

    console.log('MetricsAnalyzer: Analysis complete.');
    return metrics;
  }

  getConsumerHealth(events, consumerName, expectedIntervalHours) {
      const lastEvent = _.findLast(events, e => e.source === consumerName);
      if (!lastEvent) return 'NO_DATA';
      const hoursSinceLastEvent = (new Date() - new Date(lastEvent.timestamp)) / (1000 * 60 * 60);
      return hoursSinceLastEvent < expectedIntervalHours ? 'OK' : 'DEGRADED';
  }

  calculateIngestionGap(pollCompleteEvents) {
    if (pollCompleteEvents.length === 0) return 0; // Or maybe Infinity?
    const lastPollTime = new Date(_.last(pollCompleteEvents).timestamp);
    const gapMinutes = Math.round((new Date() - lastPollTime) / (1000 * 60));
    return gapMinutes;
  }

  calculateMemoBacklog(events) {
    const memosFetched = _.sumBy(events, e => e.event === 'POLL_COMPLETE' ? e.payload.memosFetched : 0);
    const memosProcessed = _.sumBy(events, e => e.event === 'MEMO_PROCESSED' ? 1 : 0);
    return memosFetched - memosProcessed;
  }

  detectClusterDrift(ideas) {
    // Basic drift detection: check if the distribution of idea clusters has changed significantly.
    // This is a placeholder for a more sophisticated implementation.
    if (ideas.length < 10) return false;

    const recentIdeas = ideas.slice(-10);
    const recentClusters = _.uniq(recentIdeas.map(i => i.payload.notebookId));
    
    const olderIdeas = ideas.slice(0, -10);
    const olderClusters = _.uniq(olderIdeas.map(i => i.payload.notebookId));
    
    return _.difference(recentClusters, olderClusters).length > 2;
  }
}

module.exports = MetricsAnalyzer;
