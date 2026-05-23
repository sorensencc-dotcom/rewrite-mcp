/**
 * Idea Writer - Writes clustered ideas into Joplin with idempotency and structure.
 */
import { blackBox } from '../logging/blackbox.js';
import { log } from '../logging/logger.js';

export class IdeaWriter {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {string} [config.rootNotebook] - Default: "Ideas"
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.rootNotebook = config.rootNotebook || 'Ideas';
  }

  /**
   * Writes a clustered idea to Joplin.
   * 
   * @param {Object} idea 
   * @param {string} idea.title
   * @param {string} idea.body
   * @param {string} idea.cluster - e.g. "cic/autoscale"
   * @param {string[]} idea.tags
   */
  async write(idea) {
    const sourceTag = idea.tags.find(t => t.startsWith('memos-source-'));
    if (!sourceTag) {
      log.warn('idea_writer_missing_source_tag', { title: idea.title });
      return;
    }

    try {
      // 1. Idempotency check
      const existing = await this.joplinClient.findNotesByTag(sourceTag);
      if (existing.length > 0) {
        log.debug('idea_writer_duplicate_skipped', { sourceTag, title: idea.title });
        return;
      }

      // 2. Resolve cluster path
      const fullPath = `${this.rootNotebook}/${idea.cluster}`;
      const parentId = await this.joplinClient.resolveNotebookPath(fullPath);

      // 3. Create note
      await this.joplinClient.createNote({
        title: idea.title,
        body: idea.body,
        parent_id: parentId,
        tags: idea.tags
      });

      blackBox.logEvent('IdeaClusterer', 'CREATED_IDEA', { 
        title: idea.title, 
        cluster: idea.cluster,
        sourceTag 
      });

      log.info('idea_writer_success', { 
        title: idea.title, 
        cluster: idea.cluster,
        sourceTag 
      });
    } catch (err) {
      log.error('idea_writer_failed', { 
        title: idea.title, 
        err: err.message,
        stack: err.stack 
      });
    }
  }
}
