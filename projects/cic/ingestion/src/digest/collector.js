/**
 * Daily Digest Collector - Gathers activity from Joplin for the last 24 hours.
 */
import { log } from '../logging/logger.js';

export class DigestCollector {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
  }

  /**
   * Collects all activity for a specific date (YYYY-MM-DD).
   * Defaults to today.
   * 
   * @param {string} [dateStr] 
   * @returns {Promise<Object>}
   */
  async collect(dateStr) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const joplinDate = targetDate.replace(/-/g, ''); // YYYYMMDD
    
    log.info('digest_collector_start', { targetDate });

    // Search for everything created on that date
    // Note: Joplin search 'created:YYYYMMDD' is inclusive for that day.
    const query = `created:${joplinDate}`;
    const items = await this.joplinClient.search({
      query,
      fields: 'id,title,body,parent_id,is_todo,todo_due,todo_priority,created_time'
    });

    const notebooks = await this.joplinClient.listNotebooks();
    const notebookMap = new Map(notebooks.map(n => [n.id, n.title]));

    const result = {
      date: targetDate,
      memos: [],
      tasks: [],
      ideas: [],
      operatorNotes: []
    };

    for (const item of items) {
      const notebookName = notebookMap.get(item.parent_id) || 'Unknown';
      
      // 1. Operator Notes
      if (item.body.includes('#operator-note')) {
        result.operatorNotes.push(item);
      }

      // 2. Classify by type
      if (item.is_todo === 1) {
        result.tasks.push({
          title: item.title,
          priority: item.todo_priority || 3,
          due: item.todo_due ? new Date(item.todo_due).toISOString().split('T')[0] : null,
          id: item.id
        });
      } else if (notebookName.toLowerCase().includes('idea')) {
        result.ideas.push({
          title: item.title,
          cluster: notebookName,
          id: item.id
        });
      } else {
        // Assume it's a raw memo mirror if it's not a task or idea
        result.memos.push({
          title: item.title,
          content: item.body.split('---')[0].trim(), // Get content before metadata
          tags: [], // Tags would need another API call per note, skipping for now to be efficient
          id: item.id
        });
      }
    }

    log.info('digest_collector_success', { 
      tasks: result.tasks.length, 
      ideas: result.ideas.length, 
      memos: result.memos.length 
    });

    return result;
  }
}
