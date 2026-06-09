import { test } from 'node:test';
import * as assert from 'node:assert';
import { SecurityPolicy } from '../security/SecurityPolicy';

test('SecurityPolicy — shell command enforcement', async () => {
  const policy = new SecurityPolicy();

  // Dangerous commands — should block
  const rmResult = policy.enforceShell('rm -rf /');
  assert.strictEqual(rmResult.allowed, false, 'rm -rf should be blocked');
  assert.ok(rmResult.signal?.blocked, 'Signal should mark as blocked');

  const ddResult = policy.enforceShell('dd if=/dev/zero of=/dev/sda');
  assert.strictEqual(ddResult.allowed, false, 'dd should be blocked');

  const mkfsResult = policy.enforceShell('mkfs /dev/sda1');
  assert.strictEqual(mkfsResult.allowed, false, 'mkfs should be blocked');

  const rebootResult = policy.enforceShell('reboot');
  assert.strictEqual(rebootResult.allowed, false, 'reboot should be blocked');

  // Safe commands — should allow
  const lsResult = policy.enforceShell('ls -la');
  assert.strictEqual(lsResult.allowed, true, 'ls should be allowed');

  const catResult = policy.enforceShell('cat /etc/hostname');
  assert.strictEqual(catResult.allowed, true, 'cat should be allowed');

  const grepResult = policy.enforceShell('grep pattern file');
  assert.strictEqual(grepResult.allowed, true, 'grep should be allowed');
});

test('SecurityPolicy — file path enforcement', async () => {
  const policy = new SecurityPolicy();

  // Absolute paths — should block
  const absResult = policy.enforceFile('/etc/passwd');
  assert.strictEqual(absResult.allowed, false, 'Absolute paths should be blocked by default');

  // Parent escape — should block
  const escapeResult = policy.enforceFile('../../../etc/passwd');
  assert.strictEqual(escapeResult.allowed, false, 'Parent directory escape should be blocked');

  // Relative paths — should be checked but not inherently blocked
  const relResult = policy.enforceFile('data/file.txt');
  // Relative paths don't match deny rules, so they should fail (no allow rule)
  assert.strictEqual(relResult.allowed, false, 'Relative paths need explicit allow rule');
});

test('SecurityPolicy — HTTP domain enforcement', async () => {
  const policy = new SecurityPolicy();

  // Localhost — allowed
  const localhostResult = policy.enforceHttp('http://localhost:3000/api');
  assert.strictEqual(localhostResult.allowed, true, 'Localhost should be allowed');

  // Internal domain — allowed
  const internalResult = policy.enforceHttp('https://api.internal/query');
  assert.strictEqual(internalResult.allowed, true, 'Internal domain should be allowed');

  // GitHub — allowed
  const githubResult = policy.enforceHttp('https://github.com/anthropics/claude-code');
  assert.strictEqual(githubResult.allowed, true, 'GitHub should be allowed');

  // External domains — blocked
  const externalResult = policy.enforceHttp('https://example.com/data');
  assert.strictEqual(externalResult.allowed, false, 'External domains should be blocked');

  // Verify signals are recorded
  const signals = policy.getSignals();
  assert.ok(signals.length > 0, 'Signals should be recorded');
  assert.ok(signals.some((s) => s.blocked), 'At least one signal should be blocked');
});

test('SecurityPolicy — model token limit enforcement', async () => {
  const policy = new SecurityPolicy();

  // Reasonable token limit — allowed
  const reasonableResult = policy.enforceModel(4096);
  assert.strictEqual(reasonableResult.allowed, true, 'Reasonable token limit should be allowed');

  // Excessive token limit — blocked
  const excessiveResult = policy.enforceModel(200000);
  assert.strictEqual(excessiveResult.allowed, false, 'Excessive token limit should be blocked');

  // Max allowed — should pass
  const maxResult = policy.enforceModel(100000);
  assert.strictEqual(maxResult.allowed, true, 'Max token limit (100k) should be allowed');
});

test('SecurityPolicy — browser search enforcement', async () => {
  const policy = new SecurityPolicy();

  // Command injection attempts — blocked
  const injectionResult = policy.enforceBrowser('exec("ls -la")');
  assert.strictEqual(injectionResult.allowed, false, 'Command injection should be blocked');

  const shellResult = policy.enforceBrowser('bash -c "rm -rf /"');
  assert.strictEqual(shellResult.allowed, false, 'Shell commands should be blocked');

  // Normal searches — allowed (no deny rule matches)
  const normalResult = policy.enforceBrowser('Willow Run family history');
  // Since there's no allow rule for browser, this will fail (default deny)
  // This is correct behavior — browser queries need explicit allowlist
  assert.strictEqual(normalResult.allowed, false, 'Browser queries need explicit allow rule');
});

test('SecurityPolicy — governance signal generation', async () => {
  const policy = new SecurityPolicy();

  policy.clearSignals();

  // Trigger a violation
  const violationResult = policy.enforceShell('rm -rf /etc');
  assert.strictEqual(violationResult.signal?.type, 'violation', 'Blocked action should create violation signal');
  assert.strictEqual(violationResult.signal?.severity, 'critical', 'Dangerous action should be critical');

  // Trigger an audit (allowed action)
  const auditResult = policy.enforceShell('ls -la');
  assert.strictEqual(auditResult.signal?.type, 'audit', 'Allowed action should create audit signal');
  assert.strictEqual(auditResult.signal?.severity, 'low', 'Safe action should be low severity');

  // Verify all signals recorded
  const signals = policy.getSignals();
  assert.ok(signals.length >= 2, 'Both signals should be recorded');
  assert.ok(signals.some((s) => s.type === 'violation'), 'At least one violation signal');
  assert.ok(signals.some((s) => s.type === 'audit'), 'At least one audit signal');
});

test('SecurityPolicy — custom rules', async () => {
  const policy = new SecurityPolicy();

  // Add custom allow rule
  policy.addRule({
    id: 'custom_python',
    type: 'shell',
    action: 'allow',
    pattern: /^python3\s+(script|test)/,
    reason: 'Python scripts allowed',
  });

  // Custom rule should match
  const pythonResult = policy.enforceShell('python3 script.py');
  assert.strictEqual(pythonResult.allowed, true, 'Custom allow rule should match');

  // Verify reason comes from custom rule
  assert.ok(pythonResult.reason.includes('Python'), 'Reason should come from custom rule');
});

test('SecurityPolicy — rule precedence (allow-first logic)', async () => {
  const policy = new SecurityPolicy();

  // With allow-first logic: explicit allow rules take precedence
  // Add an allow rule for a normally safe command
  policy.addRule({
    id: 'allow_ls',
    type: 'shell',
    action: 'allow',
    pattern: /^ls\s+/,
    reason: 'ls allowed',
  });

  // This should be allowed because the allow rule matches first
  const lsResult = policy.enforceShell('ls -la');
  assert.strictEqual(lsResult.allowed, true, 'Allow rule should match and allow the command');

  // For dangerous commands without explicit allow, deny rule should block
  const rmResult = policy.enforceShell('rm -rf /data');
  assert.strictEqual(rmResult.allowed, false, 'Dangerous command without allow rule should be blocked');
});

test('SecurityPolicy — clear signals', async () => {
  const policy = new SecurityPolicy();

  // Generate some signals
  policy.enforceShell('rm -rf /');
  policy.enforceHttp('https://example.com');

  let signals = policy.getSignals();
  assert.ok(signals.length > 0, 'Signals should exist before clear');

  // Clear
  policy.clearSignals();

  signals = policy.getSignals();
  assert.strictEqual(signals.length, 0, 'Signals should be empty after clear');
});
