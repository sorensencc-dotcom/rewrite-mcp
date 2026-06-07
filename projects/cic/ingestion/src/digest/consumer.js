/**
 * Daily Digest Consumer - Orchestrates the full digest generation process.
 */
import { DigestCollector } from './collector.js';
import { DigestSynthesizer } from './synthesizer.js';
import { DigestWriter } from './writer.js';
import { blackBox } from '../logging/blackbox.js';
import { log } from '../logging/logger.js';

export class DailyDigestConsumer {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   */
  constructor(config) {
    this.collector = new DigestCollector({ joplinClient: config.joplinClient });
    this.synthesizer = new DigestSynthesizer();
    this.writer = new DigestWriter({ joplinClient: config.joplinClient });
  }

  /**
   * Generates and writes the daily digest.
   * 
   * @param {string} [dateStr] YYYY-MM-DD
   */
  async generate(dateStr) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    log.info('daily_digest_generation_start', { targetDate });

    try {
      // 1. Collect
      const data = await this.collector.collect(targetDate);

      // 2. Synthesize
      const md = this.synthesizer.synthesize(data);

      // 3. Write
      await this.writer.write(targetDate, md);

      blackBox.logEvent('DigestConsumer', 'DIGEST_GENERATED', { 
        targetDate,
        memos: data.memos.length,
        tasks: data.tasks.length,
        ideas: data.ideas.length
      });

      log.info('daily_digest_generation_success', { targetDate });
    } catch (err) {
      log.error('daily_digest_generation_failed', { targetDate, err: err.message });
      throw err;
    }
  }
}
