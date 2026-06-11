// File: bob/core/pipelines/moduleGenerator.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, writeFileSafely } from './generatorHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'bob/templates/module.tpl');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/modules');

/**
 * Runs the Module Generation pipeline over AST specifications.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runModuleGenerator(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Module Generator...');
    
    // Scan AST for module definitions
    let modulesToCreate = [];

    for (const [file, data] of Object.entries(ast)) {
      const sections = data.sections || {};
      
      // Look for a heading named "Module Specification" or "Proposed Changes" or similar
      for (const sectionName of Object.keys(sections)) {
        if (sectionName.toLowerCase().includes('module') || sectionName.toLowerCase().includes('component')) {
          // Extract module definitions (mocked/stubbed matching from lines)
          const lines = sections[sectionName];
          for (const line of lines) {
            const match = line.match(/####\s+\[NEW\]\s+\[(.*?)\]/);
            if (match) {
              const name = match[1].replace('.js', '').trim();
              modulesToCreate.push({
                name,
                sourceSpec: file
              });
            }
          }
        }
      }
    }

    // Default seed if no specs are found in AST yet
    if (modulesToCreate.length === 0) {
      modulesToCreate.push({ name: 'ExecutionEngine', sourceSpec: 'docs/architecture.md' });
    }

    for (const mod of modulesToCreate) {
      const targetPath = path.join(OUTPUT_DIR, `${mod.name}.js`);
      const relativePath = path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');

      const rendered = await renderTemplate(TEMPLATE_FILE, {
        name: mod.name,
        path: relativePath,
        version: '1.0.0'
      });

      await writeFileSafely(targetPath, rendered);
      console.log(`  ✓ Generated module: ${relativePath}`);
    }

    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Module Generator failed: ${error.message}`);
    return false;
  }
}

export default {
  runModuleGenerator
};
