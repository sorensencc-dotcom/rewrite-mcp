// File: bob/core/pipelines/testGenerator.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, writeFileSafely } from './generatorHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'bob/templates/test.tpl');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/tests');

/**
 * Runs the Test Generation pipeline over AST specifications.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runTestGenerator(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Test Generator...');
    
    // Auto-generate matching test files for our generated modules
    const modules = ['ExecutionEngine']; // Fallback matching module names
    
    for (const mod of modules) {
      const targetPath = path.join(OUTPUT_DIR, `${mod}.test.js`);
      const relativePath = path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');

      const rendered = await renderTemplate(TEMPLATE_FILE, {
        name: mod,
        moduleDir: 'bob/generated/modules',
        testPath: relativePath,
        date: new Date().toISOString().slice(0, 10),
        version: '1.0.0'
      });

      await writeFileSafely(targetPath, rendered);
      console.log(`  ✓ Generated test: ${relativePath}`);
    }

    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Test Generator failed: ${error.message}`);
    return false;
  }
}

export default {
  runTestGenerator
};
