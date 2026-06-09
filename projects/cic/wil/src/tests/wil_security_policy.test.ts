import { test } from 'node:test';
import * as assert from 'node:assert';
import { SecurityPolicy } from '../security/SecurityPolicy';
import { WaylandShellAdapter, SecurityViolationError } from '../runtime/adapters/WaylandShellAdapter';
import { WaylandFileAdapter } from '../runtime/adapters/WaylandFileAdapter';
import { WaylandHttpAdapter } from '../runtime/adapters/WaylandHttpAdapter';
import { WaylandModelAdapter } from '../runtime/adapters/WaylandModelAdapter';
import { MemoryStore } from '../memory/MemoryStore';

test('WIL SecurityPolicy — config-based enforcement', async () => {
  const config = {
    shell: {
      allowedCommands: ['ls', 'cat', 'grep'],
      deniedPatterns: ['^rm\\s+(-r|-f|--recursive|--force)', '^dd\\s+'],
    },
    file: {
      allowedRoots: ['./docs', './logs'],
      readOnlyRoots: ['./vendor'],
    },
    http: {
      allowedDomains: ['localhost', 'github.com', 'archives.gov'],
    },
    model: {
      maxTokens: 50000,
      temperatureMax: 1.0,
    },
  };

  const policy = new SecurityPolicy(config);

  // Test shell allowlist
  const lsResult = policy.enforceShell('ls -la');
  assert.strictEqual(lsResult.allowed, true, 'Allowed command should pass');

  const catResult = policy.enforceShell('cat file.txt');
  assert.strictEqual(catResult.allowed, true, 'Allowed command should pass');

  // Test shell denylist
  const rmResult = policy.enforceShell('rm -rf /data');
  assert.strictEqual(rmResult.allowed, false, 'Denied pattern should be blocked');

  const ddResult = policy.enforceShell('dd if=/dev/zero');
  assert.strictEqual(ddResult.allowed, false, 'Denied pattern should be blocked');
});

test('WIL SecurityPolicy — file path enforcement', async () => {
  const config = {
    file: {
      allowedRoots: ['./docs', './logs'],
      readOnlyRoots: ['./vendor'],
    },
  };

  const policy = new SecurityPolicy(config);

  // Allowed read
  const readResult = policy.enforceFilePath('./docs/readme.md', false);
  assert.strictEqual(readResult.allowed, true, 'File in allowed root should be readable');

  // Allowed write (not in read-only)
  const writeResult = policy.enforceFilePath('./logs/app.log', true);
  assert.strictEqual(writeResult.allowed, true, 'File in allowed root should be writable');

  // Blocked write to read-only
  const readOnlyResult = policy.enforceFilePath('./vendor/package.json', true);
  assert.strictEqual(readOnlyResult.allowed, false, 'File in read-only root should block write');

  // Blocked read outside allowed roots
  const outsideResult = policy.enforceFilePath('./secret/key.pem', false);
  assert.strictEqual(outsideResult.allowed, false, 'File outside allowed roots should be blocked');
});

test('WIL SecurityPolicy — HTTP domain enforcement', async () => {
  const config = {
    http: {
      allowedDomains: ['localhost', 'github.com', 'archives.gov'],
    },
  };

  const policy = new SecurityPolicy(config);

  // Allowed domains
  const localhostResult = policy.enforceHttpDomain('http://localhost:3000/api');
  assert.strictEqual(localhostResult.allowed, true, 'Localhost should be allowed');

  const githubResult = policy.enforceHttpDomain('https://github.com/anthropics/claude-code');
  assert.strictEqual(githubResult.allowed, true, 'GitHub should be allowed');

  const archivesResult = policy.enforceHttpDomain('https://archives.gov/research');
  assert.strictEqual(archivesResult.allowed, true, 'Archives.gov should be allowed');

  // Blocked domain
  const externalResult = policy.enforceHttpDomain('https://example.com/api');
  assert.strictEqual(externalResult.allowed, false, 'External domain should be blocked');
});

test('WIL SecurityPolicy — model options enforcement', async () => {
  const config = {
    model: {
      maxTokens: 50000,
      temperatureMax: 0.9,
    },
  };

  const policy = new SecurityPolicy(config);

  // Allowed options
  const validResult = policy.enforceModelOptions({ maxTokens: 4096, temperature: 0.7 });
  assert.strictEqual(validResult.allowed, true, 'Valid model options should be allowed');

  // Exceeded token limit
  const tokensResult = policy.enforceModelOptions({ maxTokens: 100000, temperature: 0.7 });
  assert.strictEqual(tokensResult.allowed, false, 'Exceeded token limit should be blocked');

  // Exceeded temperature
  const tempResult = policy.enforceModelOptions({ maxTokens: 4096, temperature: 1.5 });
  assert.strictEqual(tempResult.allowed, false, 'Exceeded temperature should be blocked');
});

test('WIL SecurityPolicy — adapter integration', async () => {
  const config = {
    shell: {
      allowedCommands: ['ls', 'cat'],
      deniedPatterns: ['^rm\\s+(-r|-f)'],
    },
  };

  const policy = new SecurityPolicy(config);
  const memory = new MemoryStore();
  const adapter = new WaylandShellAdapter(policy, memory);

  // Allowed command should execute
  const lsResult = await adapter.execute('ls', ['-la']);
  assert.ok(lsResult.stdout.includes('Executed'));

  // Denied command should throw
  let denied = false;
  try {
    await adapter.execute('rm', ['-rf', '/data']);
  } catch (error) {
    denied = true;
    assert.ok(error instanceof SecurityViolationError, 'Should throw SecurityViolationError');
  }
  assert.strictEqual(denied, true, 'Denied command should throw');
});

test('WIL SecurityPolicy — governance signals on violation', async () => {
  const config = {
    shell: {
      deniedPatterns: ['^rm\\s+'],
    },
  };

  const policy = new SecurityPolicy(config);
  const memory = new MemoryStore();
  const adapter = new WaylandShellAdapter(policy, memory);

  try {
    await adapter.execute('rm', ['-rf', '/']);
  } catch (e) {
    // Expected
  }

  // Check that signal was logged
  const events = memory.getEvents();
  const signalEvents = events.filter((e) => e.type === 'GOVERNANCE_SIGNAL');
  assert.ok(signalEvents.length > 0, 'Governance signal should be logged on violation');
  assert.strictEqual(signalEvents[0].status, 'failed', 'Signal should indicate violation');
});
