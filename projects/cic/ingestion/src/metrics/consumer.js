const JoplinClient = require('../joplin/client');
const MetricsCollector = require('./collector');
const MetricsAnalyzer = require('./analyzer');
const MetricsWriter = require('./writer');

class MetricsConsumer {
  constructor({ joplinClient }) {
    if (!joplinClient) {
        throw new Error('MetricsConsumer requires a joplinClient instance.');
    }
    this.collector = new MetricsCollector(joplinClient);
    this.analyzer = new MetricsAnalyzer();
    this.writer = new MetricsWriter(joplinClient);
  }

  async run() {
    console.log('MetricsConsumer: Starting metrics generation cycle...');
    try {
      const rawMetrics = await this.collector.collectRawMetrics();
      const metrics = this.analyzer.analyze(rawMetrics);
      await this.writer.write(metrics);
      console.log('MetricsConsumer: Metrics generation cycle complete.');
    } catch (error) {
      console.error('MetricsConsumer: Unhandled error during metrics cycle.', error);
    }
  }
}

// This allows the consumer to be run directly for testing or cron jobs
if (require.main === module) {
  const consumer = new MetricsConsumer();
  consumer.run();
}

module.exports = MetricsConsumer;
