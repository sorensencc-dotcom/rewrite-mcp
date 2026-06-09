/**
 * Phase 28 adapter tests — verify ShellAdapter and FileAdapter work correctly
 */

const { strict: assert } = require('assert');
const { test } = require('node:test');
const { WaylandShellAdapter } = require('../runtime/adapters/WaylandShellAdapter');
const { WaylandFileAdapter } = require('../runtime/adapters/WaylandFileAdapter');

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
    await adapter.execute('git', ['clone', 'rm -rf /']);
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

test('FileAdapter – reject out-of-bounds path', async () => {
  const adapter = new WaylandFileAdapter();

  try {
    await adapter.read('/etc/passwd');
    assert.fail('Should have thrown error for out-of-bounds path');
  } catch (err) {
    assert.ok(String(err).includes('allowed roots'));
  }
});
