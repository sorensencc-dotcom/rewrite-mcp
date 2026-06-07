// File: bob/core/pipelines/configGenerator.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, writeFileSafely } from './generatorHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'bob/templates/config.tpl');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/config');

/**
 * Runs the Config Generation pipeline over AST specifications.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runConfigGenerator(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Config Generator...');
    
    const configs = [
      { filename: 'appConfig.js', appName: 'CastIronForge' }
    ];

    for (const conf of configs) {
      const targetPath = path.join(OUTPUT_DIR, conf.filename);
      const relativePath = path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');

      const rendered = await renderTemplate(TEMPLATE_FILE, {
        appName: conf.appName,
        path: relativePath,
        date: new Date().toISOString().slice(0, 10),
        version: '1.0.0'
      });

      await writeFileSafely(targetPath, rendered);
      console.log(`  ✓ Generated config: ${relativePath}`);
    }

    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Config Generator failed: ${error.message}`);
    return false;
  }
}

export default {
  runConfigGenerator
};
