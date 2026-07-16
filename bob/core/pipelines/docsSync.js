// File: bob/core/pipelines/docsSync.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/docs');

/**
 * Runs the Documentation Synchronization pipeline.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runDocsSync(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Documentation Sync...');
    
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const docIndex = Object.keys(ast).map(file => `- [${path.basename(file)}](${file})`).join('\n');
    const indexContent = `# BOB Generated Documents Index\n\n${docIndex}\n`;

    const targetPath = path.join(OUTPUT_DIR, 'docs-index.md');
    await fs.writeFile(targetPath, indexContent, 'utf8');

    console.log(`  ✓ Synchronized docs index: ${path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/')}`);
    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Docs Sync failed: ${error.message}`);
    return false;
  }
}

export default {
  runDocsSync
};
