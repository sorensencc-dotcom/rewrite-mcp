// filename: tests/prompt-drift.test.js
// date: 2026-05-18
// version: 1.0.0
// description: CIC Prompt Management System — Prompt Drift Test Suite
//              Pure Node test using node:test and node:assert.
//              Run: node --test tests/prompt-drift.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

function loadRegistry() {
  const registryPath = resolve(ROOT, 'prompts/prompts.json');
  assert.ok(existsSync(registryPath), `[drift] Registry not found at: ${registryPath}`);
  return require(registryPath);
}

function readPromptFile(relativePath) {
  const absolutePath = resolve(ROOT, relativePath);
  assert.ok(existsSync(absolutePath), `[drift] Prompt file not found: ${absolutePath}`);
  return readFileSync(absolutePath, 'utf-8');
}

const FORBIDDEN_PATTERNS = Object.freeze([
  { label: 'TODO marker',               regex: /\bTODO\b/ },
  { label: 'FIXME marker',              regex: /\bFIXME\b/ },
  { label: 'HACK marker',               regex: /\bHACK\b/ },
  { label: 'TBD marker',                regex: /\bTBD\b/ },
  { label: 'Angle-bracket placeholder', regex: /<[A-Z_]{2,}>/ },
  { label: 'Double-brace placeholder',  regex: /\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/ },
  { label: 'Ellipsis placeholder',      regex: /\[\.\.\.\]/ },
  { label: 'INSERT content marker',     regex: /\[INSERT\s+[A-Z]/ },
  { label: 'REPLACE content marker',    regex: /\[REPLACE\s+[A-Z]/ },
]);

const VERSION_HEADER_REGEX = /^#\s+version:\s+\d+\.\d+\.\d+\s*$/m;
const NAME_HEADER_REGEX    = /^#\s+name:\s+\S+/m;
const UPDATED_HEADER_REGEX = /^#\s+updated:\s+\d{4}-\d{2}-\d{2}\s*$/m;
const SEMVER_REGEX         = /^\d+\.\d+\.\d+$/;

describe('Prompt Registry', () => {
  test('registry file exists and is valid JSON', () => {
    const registryPath = resolve(ROOT, 'prompts/prompts.json');
    assert.ok(existsSync(registryPath), 'prompts.json must exist');
    const raw = readFileSync(registryPath, 'utf-8');
    let parsed;
    try { parsed = JSON.parse(raw); } catch (err) { assert.fail(`Invalid JSON: ${err.message}`); }
    assert.equal(typeof parsed, 'object');
    assert.ok(parsed !== null);
  });

  test('registry has required top-level keys', () => {
    const r = loadRegistry();
    assert.ok('version' in r);
    assert.ok('updated' in r);
    assert.ok('prompts' in r);
  });

  test('registry version is valid semver', () => {
    assert.match(loadRegistry().version, SEMVER_REGEX);
  });

  test('registry updated is valid ISO 8601 date', () => {
    assert.match(loadRegistry().updated, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('registry prompts map contains required logical names', () => {
    const { prompts } = loadRegistry();
    for (const name of ['cic', 'extractor', 'normalizer', 'schema']) {
      assert.ok(name in prompts, `Missing key: "${name}"`);
      assert.ok(typeof prompts[name] === 'string' && prompts[name].trim().length > 0);
    }
  });
});

describe('Prompt Files — Existence and Non-Empty', () => {
  test('all registered prompt files exist on disk', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(existsSync(resolve(ROOT, path)), `"${name}" not found: ${path}`);
    }
  });

  test('all registered prompt files are non-empty', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(readPromptFile(path).trim().length > 0, `"${name}" is empty`);
    }
  });

  test('all registered prompt files meet minimum length (100 chars)', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(readPromptFile(path).trim().length >= 100, `"${name}" is suspiciously short`);
    }
  });
});

describe('Prompt Files — Header Validation', () => {
  test('all prompt files have a valid # version: header', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(VERSION_HEADER_REGEX.test(readPromptFile(path)), `"${name}" missing version header`);
    }
  });

  test('all prompt files have a # name: header', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(NAME_HEADER_REGEX.test(readPromptFile(path)), `"${name}" missing name header`);
    }
  });

  test('all prompt files have a valid # updated: header', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(UPDATED_HEADER_REGEX.test(readPromptFile(path)), `"${name}" missing updated header`);
    }
  });

  test('all prompt file version headers contain valid semver', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      const match = readPromptFile(path).match(/^#\s+version:\s+(\S+)\s*$/m);
      assert.ok(match, `"${name}" missing version header`);
      assert.match(match[1], SEMVER_REGEX, `"${name}" version "${match[1]}" not semver`);
    }
  });
});

describe('Prompt Files — Forbidden Pattern Detection', () => {
  for (const { label, regex } of FORBIDDEN_PATTERNS) {
    test(`no prompt file contains: ${label}`, () => {
      const { prompts } = loadRegistry();
      for (const [name, path] of Object.entries(prompts)) {
        const match = readPromptFile(path).match(regex);
        assert.ok(match === null, `"${name}" contains [${label}]: "${match?.[0]}"`);
      }
    });
  }
});

describe('Prompt Files — Content Integrity', () => {
  test('all prompt files are valid UTF-8 (no null bytes)', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(!readPromptFile(path).includes('\0'), `"${name}" contains null bytes`);
    }
  });

  test('all prompt files contain a section separator (---)', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      assert.ok(readPromptFile(path).includes('---'), `"${name}" missing --- separator`);
    }
  });

  test('prompt body (after ---) is non-empty', () => {
    const { prompts } = loadRegistry();
    for (const [name, path] of Object.entries(prompts)) {
      const content = readPromptFile(path);
      const sep = content.indexOf('---');
      assert.ok(sep !== -1, `"${name}" has no separator`);
      assert.ok(content.slice(sep + 3).trim().length > 0, `"${name}" has empty body after ---`);
    }
  });
});
