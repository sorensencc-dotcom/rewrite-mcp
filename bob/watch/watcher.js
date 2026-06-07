// File: bob/watch/watcher.js | Date: 2026-05-31 | v1.0.0

import chokidar from 'chokidar';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBuild } from '../core/build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const WATCH_PATHS = [
  path.join(ROOT_DIR, 'docs/**/*.md'),
  path.join(ROOT_DIR, 'projects/**/*.md'),
  path.join(ROOT_DIR, 'projects/**/playbooks/*.json')
];

/**
 * Starts the file watcher system to monitor markdown updates and trigger rebuild pipelines.
 */
export async function runWatch() {
  const watcher = chokidar.watch(WATCH_PATHS, {
    ignoreInitial: true,
    persistent: true
  });

  console.log(`[BOB Watcher] Active on ${WATCH_PATHS.length} roots under: ${ROOT_DIR}`);

  watcher.on('change', async (filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);
    console.log(`📄 [BOB Watcher] Markdown changed: ${relPath}`);
    await runBuild({ changedFile: relPath });
  });

  watcher.on('add', async (filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);
    console.log(`➕ [BOB Watcher] Markdown added: ${relPath}`);
    await runBuild({ changedFile: relPath });
  });

  watcher.on('unlink', async (filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);
    console.log(`❌ [BOB Watcher] Markdown removed: ${relPath}`);
    await runBuild({ changedFile: relPath });
  });

  return watcher;
}

export default {
  runWatch
};
