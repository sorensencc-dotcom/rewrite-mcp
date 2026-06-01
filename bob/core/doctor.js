// File: bob/core/doctor.js | Date: 2026-05-31 | v1.0.0

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOB_DIR = path.resolve(__dirname, '../');

function checkNodeVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) {
    return { ok: false, message: `Node version is ${process.version} (requires >= 20).` };
  }
  return { ok: true };
}

async function checkDependencies() {
  try {
    await import('chokidar');
    await import('glob');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: 'Missing npm dependencies (chokidar or glob). Run npm install inside /bob.' };
  }
}

async function checkTemplates() {
  const templates = ['module.tpl', 'test.tpl', 'playbook.tpl', 'route.tpl', 'config.tpl'];
  const missing = [];
  
  for (const tpl of templates) {
    const tplPath = path.join(BOB_DIR, 'templates', tpl);
    try {
      await fs.access(tplPath);
    } catch (err) {
      missing.push(tpl);
    }
  }

  if (missing.length > 0) {
    return { ok: false, message: `Missing codegen template files: [${missing.join(', ')}].` };
  }
  return { ok: true };
}

async function checkParser() {
  const parserPath = path.join(BOB_DIR, 'core/parser/markdownParser.js');
  try {
    const { parseMarkdown } = await import(pathToFileURL(parserPath).href);
    const mock = parseMarkdown('## Test Section\nline1');
    if (!mock.sections['Test Section']) {
      return { ok: false, message: 'AST parser fails basic validation check.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `Parser import/execution error: ${err.message}` };
  }
}

async function checkDrift() {
  const validatorPath = path.join(BOB_DIR, 'core/validation/driftCheck.js');
  try {
    const { runDriftCheck } = await import(pathToFileURL(validatorPath).href);
    await runDriftCheck();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `Drift validator failed: ${err.message}` };
  }
}

async function checkHistory() {
  const historyDir = path.join(BOB_DIR, 'history');
  try {
    await fs.access(historyDir);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: 'History directory is missing or inaccessible.' };
  }
}

/**
 * Runs all environment checks and verifies that BOB is ready to compile the monorepo.
 */
export async function runDoctor() {
  console.log('🩺 Running BOB environment checks...');
  const results = [];

  results.push(checkNodeVersion());
  results.push(await checkDependencies());
  results.push(await checkTemplates());
  results.push(await checkParser());
  results.push(await checkDrift());
  results.push(await checkHistory());

  const failed = results.filter(r => !r.ok);

  if (failed.length > 0) {
    console.error('\n❌ BOB Doctor found issues in your environment:');
    failed.forEach(f => console.error(`  - ${f.message}`));
    process.exit(1);
  }

  console.log('\n✅ BOB environment is healthy and fully operational.');
  return true;
}

export default {
  runDoctor
};
