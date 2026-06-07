/**
 * Task Consumer - Orchestrates the task extraction and writing process.
 */
import { TaskRouter } from './router.js';
import { extractTask } from './extractor.js';
import { TaskWriter } from './writer.js';
import { log } from '../logging/logger.js';

export class TaskConsumer {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {string} [config.targetNotebook]
   */
  constructor(config) {
    this.router = new TaskRouter();
    this.writer = new TaskWriter({
      joplinClient: config.joplinClient,
      targetNotebook: config.targetNotebook
    });
  }

  /**
   * Processes an IngestionEvent.
   * 
   * @param {import('../memos/types.js').IngestionEvent} event 
   */
  async consume(event) {
    if (this.router.shouldProcess(event)) {
      log.debug('task_consumer_match', { eventId: event.id, sourceId: event.sourceId });

      try {
        // 1. Convert IngestionEvent to memo-like structure for the extractor
        const memo = {
          id: event.sourceId,
          content: event.content,
          tags: [event.primaryTag, ...event.secondaryTags]
        };

        // 2. Extract structured task data
        const task = extractTask(memo);

        // 3. Write to Joplin
        await this.writer.write(task);
      } catch (err) {
        log.error('task_consumer_failed', { eventId: event.id, err: err.message });
      }
    }
  }
}
