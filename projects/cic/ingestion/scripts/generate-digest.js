/**
 * Daily Digest Generation Script
 * 
 * Usage: node generate-digest.js [YYYY-MM-DD]
 */
import 'dotenv/config';
import { JoplinClient } from '../src/joplin/client.js';
import { DailyDigestConsumer } from '../src/digest/consumer.js';
import { log } from '../src/logging/logger.js';

async function run() {
  const JOPLIN_API_TOKEN = (process.env.JOPLIN_API_TOKEN || '').trim();
  const JOPLIN_BASE_URL = (process.env.JOPLIN_BASE_URL || 'http://localhost:41184').trim();

  if (!JOPLIN_API_TOKEN) {
    console.error('Error: JOPLIN_API_TOKEN is required in .env');
    process.exit(1);
  }

  const joplinClient = new JoplinClient({
    baseUrl: JOPLIN_BASE_URL,
    apiToken: JOPLIN_API_TOKEN
  });

  const consumer = new DailyDigestConsumer({ joplinClient });

  // Use command line arg or default to today
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];

  try {
    await consumer.generate(targetDate);
    console.log(`Success: Daily Digest generated for ${targetDate}`);
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  }
}

run();
