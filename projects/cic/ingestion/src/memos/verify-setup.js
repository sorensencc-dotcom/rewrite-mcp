import 'dotenv/config';
import { MemosClient } from './client.js';
import { JoplinClient } from '../joplin/client.js';
import { log } from '../logging/logger.js';

async function verify() {
  log.info('verification_start');

  const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL;
  const MEMOS_API_TOKEN = process.env.MEMOS_API_TOKEN;
  const JOPLIN_API_TOKEN = process.env.JOPLIN_API_TOKEN;
  const JOPLIN_BASE_URL = process.env.JOPLIN_BASE_URL || 'http://localhost:41184';

  // 1. Check Memos
  if (MEMOS_BASE_URL && MEMOS_API_TOKEN) {
    try {
      const memosClient = new MemosClient({ baseUrl: MEMOS_BASE_URL, apiToken: MEMOS_API_TOKEN });
      log.info('checking_memos', { url: MEMOS_BASE_URL });
      const memos = await memosClient.fetchMemos({ limit: 1 });
      log.info('memos_ok', { count: memos.length });
    } catch (err) {
      log.error('memos_failed', { err: err.message });
    }
  } else {
    log.warn('memos_config_missing');
  }

  // 2. Check Joplin
  if (JOPLIN_API_TOKEN) {
    try {
      const joplinClient = new JoplinClient({ baseUrl: JOPLIN_BASE_URL, apiToken: JOPLIN_API_TOKEN });
      log.info('checking_joplin', { url: JOPLIN_BASE_URL });
      const notebooks = await joplinClient.listNotebooks();
      log.info('joplin_ok', { notebookCount: notebooks.length });
    } catch (err) {
      log.error('joplin_failed', { err: err.message });
    }
  } else {
    log.warn('joplin_config_missing');
  }

  log.info('verification_complete');
}

verify();
