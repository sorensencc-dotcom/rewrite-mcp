#!/usr/bin/env node

// File: bob/bin/bob.js | Date: 2026-05-31 | v1.0.0

import { runBuild } from '../core/build.js';
import { runWatch } from '../watch/watcher.js';
import { runRollback } from '../core/audit/historyManager.js';
import { runDoctor } from '../core/doctor.js';
import { runDaemon } from '../core/daemon.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'build':
      console.log('🔧 BOB: Running full build...');
      await runBuild();
      console.log('✅ Build complete');
      break;

    case 'watch':
      console.log('👀 BOB: Watching markdown files for changes...');
      await runWatch();
      break;

    case 'rollback':
      const id = args[1];
      if (!id) {
        console.error('❌ Missing rollback ID');
        process.exit(1);
      }
      console.log(`⏪ BOB: Rolling back to ${id}...`);
      await runRollback(id);
      console.log('✅ Rollback complete');
      break;

    case 'doctor':
      await runDoctor();
      break;

    case 'daemon':
      await runDaemon();
      break;

    default:
      console.log(`
BOB — Unified Builder & Auto-Updater

Usage:
  bob build        Run full repo build
  bob watch        Watch markdown files + auto-rebuild
  bob rollback ID  Roll back to a previous generation
  bob doctor       Run environment health check
  bob daemon       Run continuous background watcher
`);
  }
}

main().catch(err => {
  console.error('❌ BOB encountered an error:', err);
  process.exit(1);
});
