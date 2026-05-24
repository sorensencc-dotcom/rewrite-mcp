/**
 * run_export.ts
 *
 * This is the main orchestration script for the AI OS Exporter skill.
 * It runs the full pipeline: generate, normalize, merge, version, and docs sync.
 */

import path from 'node:path';
import { runNormalization } from './normalize';
import { mergeNormalized } from './merge';
import { bumpVersion } from './version';
import { syncDocs } from './docs_sync';

// --- Configuration ---
const AI_OS_ROOT = path.resolve(process.cwd(), 'ai-os');
const RAW_DIR = path.join(AI_OS_ROOT, '_raw');
const NORMALIZED_DIR = path.join(AI_OS_ROOT, '_normalized');
const DOCS_DIR = path.resolve(process.cwd(), 'docs');

type Mode = "generate" | "normalize" | "merge" | "version" | "docs" | "full";

/**
 * Main entry point for the AI OS Exporter pipeline.
 */
async function main() {
  console.log('--- Starting AI OS Export Pipeline ---');

  const mode: Mode = (process.argv[2] as Mode) || 'full';
  console.log(`[Main] Running in mode: ${mode}`);

  // In a real implementation, this step would involve calling the AI
  // to produce the raw exports. For now, we assume the _raw directory
  // is populated manually or by a separate process.
  if (mode === 'generate' || mode === 'full') {
    console.log('
[Phase 1: GENERATE]');
    // TODO: Implement the generation step.
    console.log('  - Skipped: Raw generation must be done by the AI agent.');
  }

  if (mode === 'normalize' || mode === 'full') {
    console.log('
[Phase 2: NORMALIZE]');
    await runNormalization(RAW_DIR);
    console.log('  - Normalization step completed.');
  }

  if (mode === 'merge' || mode === 'full') {
    console.log('
[Phase 3: MERGE]');
    await mergeNormalized(NORMALIZED_DIR, AI_OS_ROOT);
    console.log('  - Merge step completed.');
  }

  if (mode === 'version' || mode === 'full') {
    console.log('
[Phase 4: VERSION]');
    await bumpVersion(AI_OS_ROOT, 'patch');
    console.log('  - Versioning step completed.');
  }

  if (mode === 'docs' || mode === 'full') {
    console.log('
[Phase 5: DOCS SYNC]');
    await syncDocs(AI_OS_ROOT, DOCS_DIR);
    console.log('  - Docs sync step completed.');
  }

  console.log('
--- AI OS Export Pipeline Finished ---');
}

main().catch(err => {
  console.error('
--- Pipeline Failed ---');
  console.error(err);
  process.exit(1);
});
