const JoplinClient = require('../joplin/client');
const { getBlackBoxReader } = require('../logging/blackbox');

class MetricsCollector {
  constructor(joplinClient) {
    this.joplinClient = joplinClient;
    this.readBlackBox = getBlackBoxReader(joplinClient);
  }

  async collectRawMetrics() {
    console.log('MetricsCollector: Collecting raw metrics...');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Read from Event Logs (Black Box)
    const events = await this.readBlackBox.getEventsForRange(twentyFourHoursAgo, now);

    const memos = events.filter(e => e.event === 'MEMO_PROCESSED');
    const tasks = events.filter(e => e.event === 'TASK_CREATED');
    const ideas = events.filter(e => e.event === 'IDEA_CREATED');
    const digests = events.filter(e => e.event === 'DIGEST_WRITTEN');
    const pollCompleteEvents = events.filter(e => e.event === 'POLL_COMPLETE');

    const timings = {
        poll_cycle_ms: this.extractAverageTiming(pollCompleteEvents, 'duration_ms'),
        task_extractor_ms: this.extractAverageTiming(events, 'task_extraction_duration_ms'),
        idea_clusterer_ms: this.extractAverageTiming(events, 'idea_clustering_duration_ms'),
        digest_consumer_ms: this.extractAverageTiming(events, 'digest_generation_duration_ms'),
        joplin_write_ms: this.extractAverageTiming(events, 'joplin_write_duration_ms'),
    };

    const errors = events.filter(e => e.level === 'ERROR');
    const lastSuccess = events.find(e => e.event === 'INGESTION_SUCCESS')?.timestamp;
    const lastError = errors[errors.length - 1]?.timestamp;

    console.log(`MetricsCollector: Found ${events.length} events.`);

    return {
      memos,
      tasks,
      ideas,
      digests,
      timings,
      errors,
      lastSuccess,
      lastError,
      pollCompleteEvents,
      events, // Pass all events for more detailed analysis
    };
  }

  extractAverageTiming(events, key) {
      const relevantEvents = events.filter(e => e.payload && e.payload[key] !== undefined);
      if (relevantEvents.length === 0) return 0;
      const total = relevantEvents.reduce((sum, e) => sum + e.payload[key], 0);
      return Math.round(total / relevantEvents.length);
  }
}

module.exports = MetricsCollector;
