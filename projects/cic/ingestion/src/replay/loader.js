/**
 * Replay Loader - Reconstructs a memo from Joplin or Memos API.
 */
import { log } from '../logging/logger.js';

export class ReplayLoader {
  /**
   * @param {Object} config
   * @param {import('../joplin/client.js').JoplinClient} config.joplinClient
   * @param {import('../memos/client.js').MemosClient} config.memosClient
   */
  constructor(config) {
    this.joplinClient = config.joplinClient;
    this.memosClient = config.memosClient;
  }

  /**
   * Loads a memo by ID, attempting Joplin first, then Memos API.
   * 
   * @param {string|number} memoId 
   * @returns {Promise<Object>}
   */
  async load(memoId) {
    const sourceTag = `memos-source-${memoId}`;
    
    // 1. Try Joplin
    try {
      const existing = await this.joplinClient.findNotesByTag(sourceTag);
      if (existing.length > 0) {
        // We found it in Joplin. Note: Joplin findNotesByTag returns partial info.
        // We might need to fetch the full note body.
        const noteId = existing[0].id;
        const noteUrl = new URL(`${this.joplinClient.baseUrl}/notes/${noteId}`);
        noteUrl.searchParams.append('token', this.joplinClient.apiToken);
        noteUrl.searchParams.append('fields', 'id,title,body,created_time,updated_time');
        
        const response = await fetch(noteUrl.toString());
        const note = await response.json();
        
        log.info('replay_loader_joplin_hit', { memoId, noteId });

        // Reconstruct memo from Joplin note
        // The body has the original content before the '---' metadata separator
        const content = note.body.split('---')[0].trim();
        
        return {
          id: memoId,
          content,
          tags: [], // Tags would be harder to extract exactly as they were, but for simulation we mostly care about content and tags in content
          createTime: note.created_time,
          updateTime: note.updated_time,
          source: 'joplin'
        };
      }
    } catch (err) {
      log.warn('replay_loader_joplin_failed', { memoId, err: err.message });
    }

    // 2. Try Memos API
    try {
      log.info('replay_loader_memos_api_fetch', { memoId });
      const memo = await this.memosClient.getMemo(memoId);
      return {
        ...memo,
        source: 'memos_api'
      };
    } catch (err) {
      log.error('replay_loader_fatal', { memoId, err: err.message });
      throw new Error(`Could not load memo ${memoId} from Joplin or Memos API`);
    }
  }

  /**
   * Fetches the latest memo ID from the Memos API.
   */
  async getLatestMemoId() {
    const memos = await this.memosClient.fetchMemos({ limit: 1 });
    if (memos.length > 0) {
      return memos[0].id || memos[0].name.split('/').pop();
    }
    throw new Error('No memos found in Memos API');
  }
}
