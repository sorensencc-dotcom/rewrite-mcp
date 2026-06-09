import { test } from 'node:test';
import * as assert from 'node:assert';
import { CICForeman } from '../runtime/foreman';
import { MockShellAdapter, MockFileAdapter, MockModelAdapter, MockHttpAdapter, MockBrowserAdapter } from './mocks';

test('Phase 28 Trace Example — Full Wayland → Foreman → APR → CRO → MLA/CKG Cycle', async () => {
  // Initialize Foreman with mock adapters
  const foreman = new CICForeman(
    new MockShellAdapter(),
    new MockFileAdapter(),
    new MockModelAdapter(),
    new MockHttpAdapter(),
    new MockBrowserAdapter()
  );

  const waylandSessionId = 'session_willow_run_001';
  const instruction = 'Research the history of Willow Run aircraft facility';

  console.log('\n┌─ Phase 28 Trace Example');
  console.log(`├─ Wayland Session: ${waylandSessionId}`);
  console.log(`├─ Instruction: "${instruction}"`);
  console.log('└─ Starting orchestration...\n');

  // 1. Wayland calls Foreman
  console.log('[1] Wayland sends request → CICForeman.handleRequest()');
  const result = await foreman.handleRequest(waylandSessionId, instruction);

  // 2. Verify APR plan generated
  console.log('\n[2] APR generates plan');
  assert.ok(result.plan, 'APR plan should exist');
  assert.ok(result.plan.planId, 'APR plan should have planId');
  assert.strictEqual(result.plan.goal, instruction, 'Plan should capture instruction');
  assert.ok(result.plan.taskCount > 0, 'Plan should have tasks');
  console.log(`    ✓ Plan ID: ${result.plan.planId}`);
  console.log(`    ✓ Tasks: ${result.plan.taskCount}`);
  result.plan.tasks.forEach((task) => {
    console.log(`      - ${task.id}: ${task.name}`);
  });

  // 3. Verify CRO execution
  console.log('\n[3] CRO executes plan');
  assert.ok(result.run, 'CRO run should exist');
  assert.ok(result.run.runId, 'CRO run should have runId');
  assert.strictEqual(result.run.planId, result.plan.planId, 'Run should reference plan');
  assert.ok(result.run.stepCount > 0, 'Run should have steps');
  console.log(`    ✓ Run ID: ${result.run.runId}`);
  console.log(`    ✓ Steps executed: ${result.run.stepCount}`);
  result.run.stepResults.forEach((step) => {
    console.log(`      - ${step.stepId}: ${step.status} (${step.durationMs}ms)`);
  });

  // 4. Verify MLA events logged
  console.log('\n[4] MLA events logged');
  const events = foreman.getMemoryEvents();
  assert.ok(events.length > 0, 'Should have MLA events');

  const aprPlanEvents = events.filter((e) => e.type === 'APR_PLAN');
  const croRunEvents = events.filter((e) => e.type === 'CRO_RUN');
  const telemetryEvents = events.filter((e) => e.type === 'AGENT_TELEMETRY');

  assert.ok(aprPlanEvents.length > 0, 'Should have APR_PLAN event');
  assert.ok(croRunEvents.length > 0, 'Should have CRO_RUN event');
  assert.ok(telemetryEvents.length >= 2, 'Should have telemetry events (start + end)');

  console.log(`    ✓ Total events: ${events.length}`);
  console.log(`      - APR_PLAN events: ${aprPlanEvents.length}`);
  console.log(`      - CRO_RUN events: ${croRunEvents.length}`);
  console.log(`      - AGENT_TELEMETRY events: ${telemetryEvents.length}`);

  // 5. Verify session correlation
  console.log('\n[5] Session correlation (Wayland → CIC)');
  const sessionEvents = events.filter((e) => e.waylandSessionId === waylandSessionId);
  assert.ok(sessionEvents.length > 0, 'Should correlate events to session');
  console.log(`    ✓ Events correlated to session: ${sessionEvents.length}`);
  sessionEvents.forEach((e) => {
    console.log(`      - ${e.type}: ${e.eventId}`);
  });

  // 6. Verify SecurityPolicy enforcement
  console.log('\n[6] SecurityPolicy enforcement');
  const policy = foreman.getSecurityPolicy();
  assert.ok(policy, 'SecurityPolicy should exist');

  const shellTest = policy.enforceShell('ls -la');
  assert.strictEqual(shellTest.allowed, true, 'Safe shell command should be allowed');
  console.log(`    ✓ Safe command allowed: ls -la`);

  const dangerousTest = policy.enforceShell('rm -rf /');
  assert.strictEqual(dangerousTest.allowed, false, 'Dangerous command should be blocked');
  console.log(`    ✓ Dangerous command blocked: rm -rf /`);
  console.log(`      Reason: ${dangerousTest.reason}`);

  // 7. Verify artifact completeness
  console.log('\n[7] Artifact completeness');
  assert.ok(result.plan.taskCount > 0, 'Plan should have tasks');
  assert.ok(result.run.stepCount > 0, 'Run should have steps');
  assert.strictEqual(result.plan.taskCount, result.run.stepCount, 'Tasks should map to steps');
  console.log(`    ✓ Plan tasks: ${result.plan.taskCount}`);
  console.log(`    ✓ Run steps: ${result.run.stepCount}`);
  console.log(`    ✓ Full mapping verified`);

  console.log('\n└─ Phase 28 Trace Complete ✓\n');
});

test('Phase 28 Trace Example — SecurityPolicy violation scenario', async () => {
  const foreman = new CICForeman(
    new MockShellAdapter(),
    new MockFileAdapter(),
    new MockModelAdapter(),
    new MockHttpAdapter(),
    new MockBrowserAdapter()
  );

  console.log('\n┌─ Phase 28 Security Violation Trace');

  const policy = foreman.getSecurityPolicy();

  // Test all adapter types
  console.log('\n[Shell Adapter]');
  const rmResult = policy.enforceShell('rm -rf /etc');
  assert.strictEqual(rmResult.allowed, false);
  assert.ok(rmResult.signal?.blocked);
  console.log(`  ✗ Blocked: rm -rf /etc`);
  console.log(`    Signal ID: ${rmResult.signal?.signalId}`);
  console.log(`    Severity: ${rmResult.signal?.severity}`);

  console.log('\n[File Adapter]');
  const pathResult = policy.enforceFile('/etc/passwd');
  assert.strictEqual(pathResult.allowed, false);
  console.log(`  ✗ Blocked: /etc/passwd (absolute path)`);

  console.log('\n[HTTP Adapter]');
  const httpResult = policy.enforceHttp('https://example.com/api');
  assert.strictEqual(httpResult.allowed, false);
  console.log(`  ✗ Blocked: https://example.com/api (external domain)`);

  console.log('\n[Model Adapter]');
  const modelResult = policy.enforceModel(500000);
  assert.strictEqual(modelResult.allowed, false);
  console.log(`  ✗ Blocked: 500k tokens (exceeds max 100k)`);

  console.log('\n[Browser Adapter]');
  const browserResult = policy.enforceBrowser('exec("rm -rf /")');
  assert.strictEqual(browserResult.allowed, false);
  console.log(`  ✗ Blocked: exec command injection attempt`);

  const signals = policy.getSignals();
  console.log(`\n[Governance Signals]`);
  console.log(`  Total violations: ${signals.filter((s) => s.blocked).length}`);
  signals.filter((s) => s.blocked).forEach((s) => {
    console.log(`    - ${s.adapter}: ${s.reason} [${s.severity}]`);
  });

  console.log('\n└─ Security Violations Logged ✓\n');
});

test('Phase 28 Trace Example — MLA event serialization', async () => {
  const foreman = new CICForeman(
    new MockShellAdapter(),
    new MockFileAdapter(),
    new MockModelAdapter(),
    new MockHttpAdapter(),
    new MockBrowserAdapter()
  );

  const sessionId = 'session_test_mla_001';
  const instruction = 'Test MLA event logging';

  await foreman.handleRequest(sessionId, instruction);

  const events = foreman.getMemoryEvents();
  assert.ok(events.length > 0, 'Should have events');

  console.log('\n[MLA Event Serialization]');
  events.forEach((event) => {
    console.log(`\n  Event: ${event.type}`);
    console.log(`    eventId: ${event.eventId}`);
    console.log(`    timestamp: ${event.timestamp}`);
    console.log(`    status: ${event.status}`);
    if (event.planId) console.log(`    planId: ${event.planId}`);
    if (event.runId) console.log(`    runId: ${event.runId}`);
    console.log(`    metadata: ${JSON.stringify(event.metadata).substring(0, 100)}...`);
  });

  // Verify serialization
  const serialized = JSON.stringify(events, null, 2);
  assert.ok(serialized, 'Events should serialize to JSON');
  console.log(`\n  Total serialized events: ${events.length}`);
  console.log(`  Serialization size: ${serialized.length} bytes`);
});
