import { log } from '../logging/logger.js';

/**
 * Joplin Consumer for CIC Ingestion Bus
 */
export class JoplinConsumer {
  /**
   * @param {Object} config
   * @param {import('./client.js').JoplinClient} config.joplinClient
   * @param {Record<string, string>} [config.notebookMapping] - Mapping of routingKey to notebook names or IDs
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.notebookMapping = config.notebookMapping || {
      'cic.rewritelabs.ingest': 'Rewrite Labs',
      'cic.core.ingest':        'CIC',
      'cic.generic.ingest':     'CIC',
      'cic.ideas.inbox':        'Ideas',
      'cic.tasks.inbox':        'Tasks',
      'cic.tasks.followup':     'Tasks',
      'cic.personal.inbox':     'Personal',
      'cic.reference.inbox':    'Reference',
      'cic.logs.journal':       'Personal'
    };
    this.notebookCache = new Map(); // Name/Path -> ID
  }

  /**
   * Processes an IngestionEvent and mirrors it to Joplin.
   * @param {import('../memos/types.js').IngestionEvent} event 
   */
  async consume(event) {
    log.info('joplin_consumer_start', { eventId: event.id, routingKey: event.routingKey });

    const targetPath = this.notebookMapping[event.routingKey];
    if (!targetPath) {
      log.warn('joplin_consumer_no_mapping', { routingKey: event.routingKey });
      return;
    }

    try {
      const parentId = await this.resolveNotebookId(targetPath);
      
      const title = event.content.split('\n')[0].substring(0, 80);
      const body = `${event.content}\n\n---\nSource: ${event.source} (${event.sourceId})\nPrimary Tag: ${event.primaryTag}\nSecondary Tags: ${event.secondaryTags.join(', ')}\nCreated: ${event.createdAt}`;

      await this.joplinClient.createNote({
        title,
        body,
        parent_id: parentId,
        tags: [event.primaryTag, ...event.secondaryTags]
      });

      log.info('joplin_consumer_success', { eventId: event.id, notebook: targetPath });
    } catch (err) {
      log.error('joplin_consumer_failed', { eventId: event.id, err: err.message });
    }
  }

  /**
   * Resolves a notebook path (e.g. "Business/Rewrite Labs/To-Ingest") to an ID.
   * This is a simplified version; in reality, it would need to traverse the folder tree.
   * @param {string} path 
   * @returns {Promise<string | undefined>}
   */
  async resolveNotebookId(path) {
    if (this.notebookCache.has(path)) return this.notebookCache.get(path);

    const notebooks = await this.joplinClient.listNotebooks();
    
    // For now, we'll match by the last component of the path for simplicity
    // or exact match if it exists.
    const parts = path.split('/');
    const leafName = parts[parts.length - 1];

    const match = notebooks.find(n => n.title === leafName || n.title === path);
    if (match) {
      this.notebookCache.set(path, match.id);
      return match.id;
    }

    log.warn('joplin_notebook_not_found', { path, leafName });
    return undefined;
  }
}
