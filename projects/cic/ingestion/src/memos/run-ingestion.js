import 'dotenv/config';
import { MemosClient } from './client.js';
import { MemosIngestionWorker } from './worker.js';
import { JoplinClient } from '../joplin/client.js';
import { JoplinConsumer } from '../joplin/consumer.js';
import { TaskConsumer } from '../tasks/consumer.js';
import { IdeaConsumer } from '../ideas/consumer.js';
import { MetricsConsumer } from '../metrics/consumer.js';
import { blackBox } from '../logging/blackbox.js';
import { log } from '../logging/logger.js';
// ── SkillOpt Consumer ─────────────────────────────────────────────────
import { SkillOptConsumer } from '../skillopt/consumer.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mkdir } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Simple Ingestion Bus
 */
class IngestionBus {
  constructor() {
    this.handlers = [];
  }

  subscribe(handler) {
    this.handlers.push(handler);
  }

  async publish(routingKey, event) {
    log.debug('bus_publish', { routingKey, eventId: event.id });
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (err) {
        log.error('bus_handler_failed', { routingKey, eventId: event.id, err: err.message });
      }
    }
  }
}

async function run() {
  const MEMOS_BASE_URL = (process.env.MEMOS_BASE_URL || '').trim();
  const MEMOS_API_TOKEN = (process.env.MEMOS_API_TOKEN || '').trim();
  const JOPLIN_API_TOKEN = (process.env.JOPLIN_API_TOKEN || '').trim();
  const JOPLIN_BASE_URL = (process.env.JOPLIN_BASE_URL || 'http://localhost:41184').trim();

  if (!MEMOS_BASE_URL || !MEMOS_API_TOKEN) {
    log.error('missing_config', { msg: 'MEMOS_BASE_URL and MEMOS_API_TOKEN are required' });
    process.exit(1);
  }

  const dataDir = path.join(__dirname, '../../data');
  await mkdir(dataDir, { recursive: true });

  const bus = new IngestionBus();

  // 1. Setup Joplin Consumer
  if (JOPLIN_API_TOKEN) {
    const joplinClient = new JoplinClient({
      baseUrl: JOPLIN_BASE_URL,
      apiToken: JOPLIN_API_TOKEN
    });

    // Mirroring Consumer: Creates raw notes in respective notebooks
    const joplinConsumer = new JoplinConsumer({ joplinClient });
    bus.subscribe(event => joplinConsumer.consume(event));

    // Task Extractor Consumer: Creates structured to-dos for #task memos
    const taskConsumer = new TaskConsumer({ joplinClient });
    bus.subscribe(event => taskConsumer.consume(event));

    // Idea Clusterer Consumer: Creates clustered notes for #idea memos
    const ideaConsumer = new IdeaConsumer({ joplinClient });
    bus.subscribe(event => ideaConsumer.consume(event));

    // Initialize Black Box Logger
    blackBox.init(joplinClient);

    log.info('joplin_consumers_enabled', { mirroring: true, tasks: true, ideas: true });
  } else {
    log.warn('joplin_mirroring_disabled', { msg: 'JOPLIN_API_TOKEN not provided' });
  }

  // ── SkillOpt Consumer ─────────────────────────────────────────────────
  const skillOptConsumer = new SkillOptConsumer({
    skillsDir: path.join(__dirname, '../../skills'),
    outputDir: path.join(__dirname, '../../skillopt/data'),
    devMode: process.env.SKILLOPT_DEV_MODE === 'true',
  });

  // Subscribe to redesign events
  bus.subscribe(event => {
    if (event.intent === 'redesign' || event.emit_skillopt) {
      skillOptConsumer.consume(event);
    }
  });

  log.info('skillopt_consumer_enabled', { 
    devMode: process.env.SKILLOPT_DEV_MODE === 'true' 
  });

  // 2. Setup Memos Worker
  const memosClient = new MemosClient({
    baseUrl: MEMOS_BASE_URL,
    apiToken: MEMOS_API_TOKEN
  });

  const worker = new MemosIngestionWorker({
    memosClient,
    bus,
    stateFilePath: path.join(__dirname, '../../data/memos_state.json'),
    pollIntervalMs: parseInt(process.env.MEMOS_POLL_INTERVAL_MS || '30000', 10)
  });

  // Black Box: Record startup
  blackBox.logEvent('IngestionWorker', 'STARTUP', { pollIntervalMs: worker.pollIntervalMs });

  // 3. Start
  log.info('memos_ingestion_starting');
  
  // Heartbeat to confirm the process is alive
  const heartbeat = setInterval(() => {
    log.debug('worker_heartbeat_alive');
  }, 60000);

  try {
    await worker.start();
    log.warn('worker_loop_exited_unexpectedly');
  } catch (err) {
    log.error('worker_start_failed', { err: err.message, stack: err.stack });
    throw err;
  } finally {
    clearInterval(heartbeat);
  }
}

process.on('uncaughtException', (err) => {
  log.error('uncaught_exception', { err: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('unhandled_rejection', { reason: String(reason) });
  process.exit(1);
});

run().catch(err => {
  log.error('memos_ingestion_fatal', { err: err.message });
  process.exit(1);
});
