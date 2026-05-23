/**
 * Task Writer - Writes structured tasks into Joplin with idempotency.
 */
import { blackBox } from '../logging/blackbox.js';
import { log } from '../logging/logger.js';

export class TaskWriter {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {string} [config.targetNotebook] - Default: "Tasks"
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.targetNotebook = config.targetNotebook || 'Tasks';
  }

  /**
   * Writes a structured task to Joplin idempotently.
   * 
   * @param {Object} task Structured task from extractor
   * @param {string} task.title
   * @param {string} task.body
   * @param {string|null} task.due
   * @param {number} task.priority
   * @param {string[]} task.tags
   */
  async write(task) {
    const sourceTag = task.tags.find(t => t.startsWith('memos-source-'));
    if (!sourceTag) {
      log.warn('task_writer_missing_source_tag', { title: task.title });
      return;
    }

    try {
      // 1. Idempotency check: Have we already processed this memo?
      const existing = await this.joplinClient.findNotesByTag(sourceTag);
      if (existing.length > 0) {
        log.debug('task_writer_duplicate_skipped', { sourceTag, title: task.title });
        blackBox.logEvent('TaskExtractor', 'SKIPPED_DUPLICATE', { sourceTag, title: task.title });
        return;
      }

      // 2. Resolve or create target notebook
      const notebook = await this.joplinClient.getOrCreateNotebook(this.targetNotebook);
      
      // 3. Prepare Joplin note data
      const noteData = {
        title: task.title,
        body: task.body,
        parent_id: notebook.id,
        is_todo: 1, // Marks it as a to-do in Joplin
        tags: task.tags
      };

      // Handle due date
      if (task.due) {
        // Convert YYYY-MM-DD to milliseconds for Joplin
        noteData.todo_due = new Date(task.due).getTime();
      }

      // Optional: Store priority in a custom field or prefix title
      // Joplin doesn't have a native priority field, so we'll just store it 
      // in the note data in case a plugin or future version uses it.
      noteData.todo_priority = task.priority;

      // 4. Create the to-do
      await this.joplinClient.createNote(noteData);
      
      blackBox.logEvent('TaskExtractor', 'CREATED_TASK', { 
        title: task.title, 
        sourceTag, 
        due: task.due, 
        priority: task.priority 
      });

      log.info('task_writer_success', { 
        title: task.title, 
        sourceTag, 
        due: task.due, 
        priority: task.priority 
      });
    } catch (err) {
      log.error('task_writer_failed', { 
        title: task.title, 
        err: err.message,
        stack: err.stack 
      });
    }
  }
}
