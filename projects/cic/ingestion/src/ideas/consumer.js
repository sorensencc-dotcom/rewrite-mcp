/**
 * Idea Consumer - Orchestrates the idea extraction, clustering, and writing process.
 */
import { IdeaRouter } from './router.js';
import { extractIdea } from './extractor.js';
import { IdeaClusterer } from './clusterer.js';
import { IdeaWriter } from './writer.js';
import { log } from '../logging/logger.js';

export class IdeaConsumer {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {string} [config.rootNotebook]
   */
  constructor(config) {
    this.router = new IdeaRouter();
    this.clusterer = new IdeaClusterer();
    this.writer = new IdeaWriter({
      joplinClient: config.joplinClient,
      rootNotebook: config.rootNotebook
    });
  }

  /**
   * Processes an IngestionEvent.
   * 
   * @param {import('../memos/types.js').IngestionEvent} event 
   */
  async consume(event) {
    if (this.router.shouldProcess(event)) {
      log.debug('idea_consumer_match', { eventId: event.id, sourceId: event.sourceId });

      try {
        // 1. Convert to memo-like structure
        const memo = {
          id: event.sourceId,
          content: event.content,
          tags: [event.primaryTag, ...event.secondaryTags]
        };

        // 2. Extract
        const idea = extractIdea(memo);

        // 3. Cluster
        idea.cluster = this.clusterer.cluster(idea);

        // 4. Write
        await this.writer.write(idea);
      } catch (err) {
        log.error('idea_consumer_failed', { eventId: event.id, err: err.message });
      }
    }
  }
}
