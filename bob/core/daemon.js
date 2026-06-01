// File: bob/core/daemon.js | Date: 2026-05-31 | v1.0.0

import { runWatch } from '../watch/watcher.js';

/**
 * Runs a continuous daemon watch session in the background.
 */
export async function runDaemon() {
  console.log('🚀 BOB: Background Daemon Started');
  console.log('  Press Ctrl+C to terminate the daemon process.');

  const watcher = await runWatch();

  process.on('SIGINT', async () => {
    console.log('\n🛑 BOB Daemon shutting down gracefully...');
    await watcher.close();
    console.log('✅ Shutdown complete.');
    process.exit(0);
  });
}

export default {
  runDaemon
};
