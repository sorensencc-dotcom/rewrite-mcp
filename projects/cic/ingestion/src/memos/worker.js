import { readFile, writeFile } from 'node:fs/promises';
import { extractPrimaryTag, extractSecondaryTags, computeRoutingKey } from './routing.js';
import { blackBox } from '../logging/blackbox.js';
import { log } from '../logging/logger.js';

/**
 * Memos Ingestion Worker
 */
export class MemosIngestionWorker {
  /**
   * @param {Object} config
   * @param {import('./client.js').MemosClient} config.memosClient
   * @param {Object} config.bus - Ingestion bus (or dispatcher)
   * @param {string} config.stateFilePath - Path to persist the cursor
   * @param {number} [config.pollIntervalMs] - Polling interval (default 30s)
   */
  constructor(config) {
    this.memosClient = config.memosClient;
    this.bus = config.bus;
    this.metricsConsumer = config.metricsConsumer; // Store the metrics consumer
    this.stateFilePath = config.stateFilePath;
    this.pollIntervalMs = config.pollIntervalMs || 30000;
    this.running = false;
  }

  /**
   * Starts the worker loop.
   */
  async start() {
    if (this.running) return;
    this.running = true;
    log.info('memos_worker_start', { pollIntervalMs: this.pollIntervalMs });

    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        log.error('memos_worker_poll_failed', { err: err.message });
      }
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  /**
   * Stops the worker loop.
   */
  stop() {
    this.running = false;
  }

  /**
   * Polls Memos API and processes new memos.
   */
  async poll() {
    const state = await this.loadState();
    let cursor = state.lastCursorTs || 0;

    log.info('memos_poll_start', { cursor });
    blackBox.logEvent('IngestionWorker', 'POLL_START', { cursor });

    let memos;
    try {
      memos = await this.memosClient.fetchMemos({ afterTs: cursor });
    } catch (err) {
      log.error('memos_fetch_failed', { err: err.message });
      return;
    }

    if (!memos || !memos.length) {
      log.info('memos_poll_no_new_memos');
      // Even if no memos, we save state to confirm the loop is functional
      await this.saveState({ lastCursorTs: cursor, lastPoll: new Date().toISOString() });
      return;
    }

    log.info('memos_found', { count: memos.length });

    for (const memo of memos) {
      const event = this.memoToIngestionEvent(memo);
      if (!event) {
        log.debug('memo_skipped_no_primary_tag', { memoId: memo.id || memo.name });
        continue;
      }

      log.info('memos_processing_event', { eventId: event.id, routingKey: event.routingKey });

      // Publish to bus
      await this.bus.publish(event.routingKey, event);
      
      // Update local cursor if this memo is newer
      const memoTs = memo.updateTime ? Math.floor(new Date(memo.updateTime).getTime() / 1000) : (memo.updatedTs || memo.createdTs || 0);
      if (memoTs > cursor) {
        cursor = memoTs;
      }
    }

    await this.saveState({ lastCursorTs: cursor, lastPoll: new Date().toISOString() });
    log.info('memos_poll_complete', { newCursor: cursor });
    blackBox.logEvent('IngestionWorker', 'POLL_COMPLETE', { fetchedMemoCount: memos.length, newCursor: cursor });
  }

  /**
   * Maps a raw Memos payload to a normalized IngestionEvent.
   * @param {any} memo 
   * @returns {import('./types.js').IngestionEvent | null}
   */
  memoToIngestionEvent(memo) {
    // Memos v1 uses 'tags' array, v0.22 uses tags in content
    let tags = memo.tags || [];
    
    // If no tags array, try to extract from content (fallback)
    if (tags.length === 0 && memo.content) {
      const tagMatches = memo.content.match(/#(\w+)/g);
      if (tagMatches) {
        tags = tagMatches.map(t => t.replace('#', ''));
      }
    }

    const primary = extractPrimaryTag(tags);
    if (!primary) return null;

    const secondary = extractSecondaryTags(tags, primary);
    const routingKey = computeRoutingKey(primary, secondary);

    // Memos v1 uses ISO strings for times (createTime, updateTime)
    const createdAt = memo.createTime || (memo.createdTs ? new Date(memo.createdTs * 1000).toISOString() : new Date().toISOString());
    const updatedAt = memo.updateTime || (memo.updatedTs ? new Date(memo.updatedTs * 1000).toISOString() : createdAt);

    return {
      id: `cic:memos:${memo.id || memo.name}`,
      source: 'memos',
      sourceId: String(memo.id || memo.name),
      primaryTag: primary,
      secondaryTags: secondary,
      content: memo.content,
      createdAt,
      updatedAt,
      authorId: String(memo.creatorId || memo.creator || 'unknown'),
      routingKey,
      raw: memo
    };
  }

  /**
   * Loads the persistence state.
   * @returns {Promise<Object>}
   */
  async loadState() {
    try {
      const data = await readFile(this.stateFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return {};
    }
  }

  /**
   * Saves the persistence state.
   * @param {Object} state 
   */
  async saveState(state) {
    await writeFile(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
