// File: bob/core/pipelines/playbookGenerator.js | Date: 2026-05-31 | v1.0.0

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate, writeFileSafely } from './generatorHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'bob/templates/playbook.tpl');
const OUTPUT_DIR = path.join(ROOT_DIR, 'bob/generated/playbooks');

/**
 * Runs the Playbook Generation pipeline over AST specifications.
 * 
 * @param {Object} ast - Parsed markdown AST.
 * @returns {Promise<boolean>}
 */
export async function runPlaybookGenerator(ast = {}) {
  try {
    console.log('[BOB Pipeline] Running Playbook Generator...');
    
    // Parse playbook details if present in AST
    const stages = [
      { name: "SemanticExtractor", mode: "parallel", weight: 0.9 },
      { name: "RelationshipExtractor", mode: "conditional", requires: ["semantic.confidence > 0.85"] },
      { name: "TopicExtractor", mode: "serial" }
    ];
    const rules = {
      skipIf: ["latency.p95 > 500ms", "drift.accuracy < 0.6"],
      forceRun: ["ImageAnalyzerV2 when doc.type == image"]
    };

    const targetPath = path.join(OUTPUT_DIR, 'playbook.current.json');
    const relativePath = path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');

    const rendered = await renderTemplate(TEMPLATE_FILE, {
      version: 'pb-1.0.0',
      stages,
      rules
    });

    await writeFileSafely(targetPath, rendered);
    console.log(`  ✓ Generated playbook: ${relativePath}`);

    return true;
  } catch (error) {
    console.error(`[BOB Pipeline] Playbook Generator failed: ${error.message}`);
    return false;
  }
}

export default {
  runPlaybookGenerator
};
