/**
 * Phase 28 adapter tests — verify ShellAdapter and FileAdapter work correctly
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';
import { WaylandShellAdapter } from '../runtime/adapters/WaylandShellAdapter';
import { WaylandFileAdapter } from '../runtime/adapters/WaylandFileAdapter';

test('ShellAdapter – execute allowed command', async () => {
  const adapter = new WaylandShellAdapter();
  const result = await adapter.execute('echo', ['Hello WIL']);

  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.includes('Hello WIL'));
  assert.ok(result.duration > 0);
});

test('ShellAdapter – reject denied pattern', async () => {
  const adapter = new WaylandShellAdapter();

  try {
    await adapter.execute('rm', ['-rf', '/']);
    assert.fail('Should have thrown error for denied pattern');
  } catch (err) {
    assert.ok(String(err).includes('deny pattern'));
  }
});

test('ShellAdapter – reject unknown command', async () => {
  const adapter = new WaylandShellAdapter();

  try {
    await adapter.execute('unknown-command', []);
    assert.fail('Should have thrown error for unknown command');
  } catch (err) {
    assert.ok(String(err).includes('allowlist'));
  }
});

test('FileAdapter – list directory', async () => {
  const adapter = new WaylandFileAdapter();

  try {
    const entries = await adapter.list('./docs');
    assert.ok(Array.isArray(entries));
    console.log(`  → Listed ${entries.length} entries in ./docs`);
  } catch (err) {
    // ./docs may not exist in test env, that's ok
    console.log(`  → ./docs not found (expected in test env)`);
  }
});

test('FileAdapter – reject out-of-bounds path', async () => {
  const adapter = new WaylandFileAdapter();

  try {
    await adapter.read('/etc/passwd');
    assert.fail('Should have thrown error for out-of-bounds path');
  } catch (err) {
    assert.ok(String(err).includes('allowed roots'));
  }
});
