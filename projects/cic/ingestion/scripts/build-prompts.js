// filename: scripts/build-prompts.js
// date: 2026-05-18
// version: 1.0.0
// description: CIC Prompt Management System — Prompt Build Runner
//              Usage: node scripts/build-prompts.js

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadAll } from '../src/prompts/loader.js';
import { guardPrompt } from '../src/prompts/guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const VERSION_HEADER_REGEX = /^#\s+version:\s+(\d+\.\d+\.\d+)\s*$/m;
const NAME_HEADER_REGEX    = /^#\s+name:\s+(\S+)/m;
const UPDATED_HEADER_REGEX = /^#\s+updated:\s+(\d{4}-\d{2}-\d{2})\s*$/m;
const SEMVER_REGEX         = /^\d+\.\d+\.\d+$/;
const FORBIDDEN = [
  { label: 'TODO',                      regex: /\bTODO\b/ },
  { label: 'FIXME',                     regex: /\bFIXME\b/ },
  { label: 'TBD',                       regex: /\bTBD\b/ },
  { label: 'angle-bracket placeholder', regex: /<[A-Z_]{2,}>/ },
  { label: 'double-brace placeholder',  regex: /\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/ },
  { label: 'ellipsis placeholder',      regex: /\[\.\.\.\]/ },
  { label: 'INSERT marker',             regex: /\[INSERT\s+[A-Z]/ },
  { label: 'REPLACE marker',            regex: /\[REPLACE\s+[A-Z]/ },
];

const results = [];
let totalFailures = 0;

function pass(name, msg) { process.stdout.write(`  ✓ [${name}] ${msg}\n`); }
function fail(name, msg) { process.stderr.write(`  ✗ [${name}] ${msg}\n`); totalFailures++; }
function header(text)    { process.stdout.write(`\n${text}\n${'─'.repeat(text.length)}\n`); }

header('CIC Prompt Build Runner v1.0.0');
process.stdout.write(`Root: ${ROOT}\n`);

const registryPath = resolve(ROOT, 'prompts/prompts.json');
if (!existsSync(registryPath)) {
  process.stderr.write(`[build] FATAL: Registry not found at ${registryPath}\n`);
  process.exit(1);
}

let registry;
try { registry = require(registryPath); } catch (err) {
  process.stderr.write(`[build] FATAL: Failed to parse prompts.json — ${err.message}\n`);
  process.exit(1);
}

if (!registry.prompts || typeof registry.prompts !== 'object') {
  process.stderr.write('[build] FATAL: prompts.json missing "prompts" key\n');
  process.exit(1);
}

header('Step 1 — Registry');
pass('registry', `${Object.keys(registry.prompts).length} prompt(s) registered`);
pass('registry', `version: ${registry.version}  updated: ${registry.updated}`);
for (const name of ['cic', 'extractor', 'normalizer', 'schema']) {
  name in registry.prompts
    ? pass('registry', `required key present: "${name}"`)
    : fail('registry', `required key missing: "${name}"`);
}

header('Step 2 — Loading Prompt Files');
let loadedPrompts;
try {
  loadedPrompts = loadAll(registry.prompts, ROOT);
  for (const name of Object.keys(registry.prompts)) {
    pass(name, `loaded (${loadedPrompts[name].length} chars)`);
  }
} catch (err) {
  process.stderr.write(`[build] FATAL: Load failure — ${err.message}\n`);
  process.exit(1);
}

header('Step 3 — Validating Prompt Files');
for (const [name, content] of Object.entries(loadedPrompts)) {
  const issues = [];

  if (!content || content.trim().length === 0) {
    fail(name, 'file is empty'); issues.push('empty');
  } else { pass(name, 'non-empty'); }

  const vMatch = content.match(VERSION_HEADER_REGEX);
  if (!vMatch)                            { fail(name, 'missing version header'); issues.push('no version'); }
  else if (!SEMVER_REGEX.test(vMatch[1])) { fail(name, `version "${vMatch[1]}" not semver`); issues.push('bad semver'); }
  else                                    { pass(name, `version: ${vMatch[1]}`); }

  NAME_HEADER_REGEX.test(content)
    ? pass(name, `name header present`)
    : (fail(name, 'missing name header'), issues.push('no name'));

  UPDATED_HEADER_REGEX.test(content)
    ? pass(name, 'updated header present')
    : (fail(name, 'missing updated header'), issues.push('no updated'));

  if (!content.includes('---')) {
    fail(name, 'missing --- separator'); issues.push('no separator');
  } else {
    const body = content.slice(content.indexOf('---') + 3).trim();
    body.length > 0 ? pass(name, `body: ${body.length} chars`) : (fail(name, 'empty body'), issues.push('empty body'));
  }

  for (const { label, regex } of FORBIDDEN) {
    const m = content.match(regex);
    if (m) { fail(name, `forbidden [${label}]: "${m[0]}"`); issues.push(`forbidden:${label}`); }
  }

  const guard = guardPrompt(content);
  if (!guard.safe) {
    for (const v of guard.violations) {
      fail(name, `injection [${v.category}] "${v.match}"`); issues.push(`inject:${v.category}`);
    }
  } else { pass(name, 'injection guard: clean'); }

  results.push({ name, ok: issues.length === 0, issues });
}

header('Step 4 — Summary');
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
process.stdout.write(`Total: ${results.length}  Passed: ${passed}  Failed: ${failed}  Violations: ${totalFailures}\n\n`);

if (failed > 0) {
  process.stderr.write('Failed prompts:\n');
  for (const r of results.filter(r => !r.ok)) {
    process.stderr.write(`  ${r.name}: ${r.issues.join(', ')}\n`);
  }
  process.stderr.write('\n[build] BUILD FAILED\n');
  process.exit(1);
}

process.stdout.write('[build] BUILD PASSED\n');
process.exit(0);
