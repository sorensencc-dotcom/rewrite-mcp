// File: bob/core/pipelines/routeGenerator.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, writeFileSafely } from './generatorHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'bob/templates/route.tpl');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/routes');

/**
 * Runs the Route Generation pipeline over AST specifications.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runRouteGenerator(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Route Generator...');
    
    const routes = [
      { handlerName: 'handleGetPlaybookCurrent', routePath: '/playbook/current' },
      { handlerName: 'handleGetPlaybookHistory', routePath: '/playbook/history' }
    ];

    for (const route of routes) {
      const targetPath = path.join(OUTPUT_DIR, `${route.handlerName}.js`);
      const relativePath = path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');

      const rendered = await renderTemplate(TEMPLATE_FILE, {
        handlerName: route.handlerName,
        path: relativePath,
        date: new Date().toISOString().slice(0, 10),
        version: '1.0.0'
      });

      await writeFileSafely(targetPath, rendered);
      console.log(`  ✓ Generated route: ${relativePath}`);
    }

    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Route Generator failed: ${error.message}`);
    return false;
  }
}

export default {
  runRouteGenerator
};
