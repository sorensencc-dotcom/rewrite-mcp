/**
 * Event Writer - Persists log lines to Joplin as append-only event logs.
 */

export class EventWriter {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.rootPath = 'System/Events';
  }

  /**
   * Appends a log line to the daily event log note in Joplin.
   * 
   * @param {string} line Formatted log line
   */
  async append(line) {
    const timestamp = line.split(' | ')[0];
    const date = timestamp.split('T')[0];
    const [year, month] = date.split('-');
    
    const notebookPath = `${this.rootPath}/${year}/${month}`;
    const title = `${date}.md`; // Consistent naming with contract

    try {
      // 1. Resolve notebook path
      const parentId = await this.joplinClient.resolveNotebookPath(notebookPath);

      // 2. Find or create the daily log note
      // Using search to find exact title in the correct parent notebook
      const existing = await this.joplinClient.search({
        query: `"${title}"`,
        fields: 'id,title,body,parent_id'
      });

      const match = existing.find(n => n.title === title && n.parent_id === parentId);

      if (match) {
        // Append to existing
        const newBody = `${match.body}\n${line}`.trim();
        await this.joplinClient.updateNote(match.id, { body: newBody });
      } else {
        // Create new
        await this.joplinClient.createNote({
          title,
          body: line,
          parent_id: parentId,
          tags: ['event-log', `events-${date}`]
        });
      }
    } catch (err) {
      // Best-effort: Log to stderr and continue
      process.stderr.write(`EVENT_LOG_WRITE_FAILED: ${err.message}\nLine: ${line}\n`);
    }
  }
}
