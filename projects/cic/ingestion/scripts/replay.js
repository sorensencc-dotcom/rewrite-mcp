/**
 * Replay CLI Tool
 * 
 * Usage: node replay.js <memoId|latest>
 */
import 'dotenv/config';
import { JoplinClient } from '../src/joplin/client.js';
import { MemosClient } from '../src/memos/client.js';
import { ReplayEngine } from '../src/replay/engine.js';

async function run() {
  const MEMOS_BASE_URL = (process.env.MEMOS_BASE_URL || '').trim();
  const MEMOS_API_TOKEN = (process.env.MEMOS_API_TOKEN || '').trim();
  const JOPLIN_API_TOKEN = (process.env.JOPLIN_API_TOKEN || '').trim();
  const JOPLIN_BASE_URL = (process.env.JOPLIN_BASE_URL || 'http://localhost:41184').trim();

  if (!MEMOS_BASE_URL || !MEMOS_API_TOKEN || !JOPLIN_API_TOKEN) {
    console.error('Error: MEMOS_BASE_URL, MEMOS_API_TOKEN, and JOPLIN_API_TOKEN are required in .env');
    process.exit(1);
  }

  const memoId = process.argv[2];
  if (!memoId) {
    console.error('Usage: node replay.js <memoId|latest>');
    process.exit(1);
  }

  const joplinClient = new JoplinClient({
    baseUrl: JOPLIN_BASE_URL,
    apiToken: JOPLIN_API_TOKEN
  });

  const memosClient = new MemosClient({
    baseUrl: MEMOS_BASE_URL,
    apiToken: MEMOS_API_TOKEN
  });

  const engine = new ReplayEngine({
    joplinClient,
    memosClient
  });

  try {
    const report = await engine.replay(memoId);
    console.log(report);
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  }
}

run();
