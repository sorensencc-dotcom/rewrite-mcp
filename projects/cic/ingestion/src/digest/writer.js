/**
 * Daily Digest Writer - Writes the synthesized digest into Joplin.
 */
import { log } from '../logging/logger.js';

export class DigestWriter {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
  }

  /**
   * Writes the digest note to Joplin.
   * 
   * @param {string} date YYYY-MM-DD
   * @param {string} content Markdown content
   */
  async write(date, content) {
    const [year, month] = date.split('-');
    const notebookPath = `Daily/Digests/${year}/${month}`;
    const title = `Daily Digest — ${date}`;
    const tag = `digest-${date}`;

    try {
      // 1. Resolve notebook
      const parentId = await this.joplinClient.resolveNotebookPath(notebookPath);

      // 2. Check for existing digest (idempotency/overwrite)
      const existing = await this.joplinClient.search({
        query: `"${title}"`,
        fields: 'id,title,parent_id'
      });

      const match = existing.find(n => n.title === title && n.parent_id === parentId);

      if (match) {
        log.info('digest_writer_overwrite', { title, id: match.id });
        await this.joplinClient.updateNote(match.id, {
          body: content
        });
      } else {
        log.info('digest_writer_create', { title });
        await this.joplinClient.createNote({
          title,
          body: content,
          parent_id: parentId,
          tags: ['daily-digest', tag]
        });
      }

      log.info('digest_writer_success', { title });
    } catch (err) {
      log.error('digest_writer_failed', { date, err: err.message });
      throw err;
    }
  }
}
