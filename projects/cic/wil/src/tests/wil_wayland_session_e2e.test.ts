import { test } from 'node:test';
import * as assert from 'node:assert';
import { CICForeman } from '../runtime/foreman';
import { WaylandShellAdapter } from '../runtime/adapters/WaylandShellAdapter';
import { WaylandFileAdapter } from '../runtime/adapters/WaylandFileAdapter';
import { WaylandModelAdapter } from '../runtime/adapters/WaylandModelAdapter';
import { WaylandHttpAdapter } from '../runtime/adapters/WaylandHttpAdapter';
import { MockBrowserAdapter } from './mocks';
import { SecurityPolicy } from '../security/SecurityPolicy';
import { MemoryStore } from '../memory/MemoryStore';

test('WIL Wayland Session E2E — full cycle with policy enforcement', async () => {
  const securityConfig = {
    shell: {
      allowedCommands: ['ls', 'git status', 'grep'],
      deniedPatterns: ['^rm\\s+(-r|-f|--recursive|--force)', '^dd\\s+'],
    },
    file: {
      allowedRoots: ['./docs', './logs', './data'],
      readOnlyRoots: ['./vendor', './node_modules'],
    },
    http: {
      allowedDomains: ['localhost', '127.0.0.1', 'github.com', 'archives.gov'],
    },
    model: {
      maxTokens: 50000,
      temperatureMax: 1.0,
    },
  };

  const policy = new SecurityPolicy(securityConfig);

  // Create Foreman with security config (creates its own memory)
  const shell = new WaylandShellAdapter(policy);
  const file = new WaylandFileAdapter(policy);
  const model = new WaylandModelAdapter(policy);
  const http = new WaylandHttpAdapter(policy);
  const browser = new MockBrowserAdapter();

  const foreman = new CICForeman(shell, file, model, http, browser, securityConfig);

  const sessionId = 'wayland_session_e2e_001';
  const instruction = 'Analyze project structure and summarize findings';

  console.log('\n[E2E Test] Wayland Session → CIC Full Cycle');
  console.log(`Session: ${sessionId}`);
  console.log(`Instruction: "${instruction}"\n`);

  // Execute full cycle
  const result = await foreman.handleRequest(sessionId, instruction);

  // Verify APR plan
  assert.ok(result.plan, 'APR plan should exist');
  assert.ok(result.plan.planId, 'Plan should have ID');
  assert.ok(result.plan.taskCount > 0, 'Plan should have tasks');
  console.log(`✓ APR Plan generated: ${result.plan.planId} (${result.plan.taskCount} tasks)`);

  // Verify CRO run
  assert.ok(result.run, 'CRO run should exist');
  assert.ok(result.run.runId, 'Run should have ID');
  assert.ok(result.run.stepCount > 0, 'Run should have steps');
  console.log(`✓ CRO Run executed: ${result.run.runId} (${result.run.stepCount} steps)`);

  // Verify MLA events
  const events = foreman.getMemoryEvents();
  assert.ok(events.length > 0, 'Should have MLA events');

  const aprEvents = events.filter((e) => e.type === 'APR_PLAN');
  const croEvents = events.filter((e) => e.type === 'CRO_RUN');
  const adapterEvents = events.filter((e) => e.type === 'ADAPTER_CALL');
  const telemetryEvents = events.filter((e) => e.type === 'AGENT_TELEMETRY');

  assert.ok(aprEvents.length > 0, 'Should have APR_PLAN events');
  assert.ok(croEvents.length > 0, 'Should have CRO_RUN events');
  assert.ok(telemetryEvents.length > 0, 'Should have AGENT_TELEMETRY events');

  console.log(`✓ MLA Events logged: ${events.length} total`);
  console.log(`  - APR_PLAN: ${aprEvents.length}`);
  console.log(`  - CRO_RUN: ${croEvents.length}`);
  console.log(`  - ADAPTER_CALL: ${adapterEvents.length}`);
  console.log(`  - AGENT_TELEMETRY: ${telemetryEvents.length}`);

  // Verify session correlation
  const sessionEvents = events.filter((e) => e.waylandSessionId === sessionId);
  assert.ok(sessionEvents.length > 0, 'Should correlate events to session');
  console.log(`✓ Session correlation: ${sessionEvents.length} events → ${sessionId}`);

  // Verify session mapping
  const mappingEvents = events.filter((e) => e.metadata?.correlationType === 'wayland_session_mapping');
  assert.ok(mappingEvents.length > 0, 'Should log session mapping');
  console.log(`✓ Session mapping: ${sessionId} → ${result.plan.planId} → ${result.run.runId}`);

  console.log('\n[E2E Test] ✓ Full cycle passed\n');
});

test('WIL Wayland Session E2E — policy violations blocked and logged', async () => {
  const securityConfig = {
    shell: {
      allowedCommands: ['ls'],
      deniedPatterns: ['^rm\\s+'],
    },
    file: {
      allowedRoots: ['./allowed'],
      readOnlyRoots: ['./readonly'],
    },
    http: {
      allowedDomains: ['localhost'],
    },
  };

  const policy = new SecurityPolicy(securityConfig);
  const memory = new MemoryStore();

  const shell = new WaylandShellAdapter(policy, memory);
  const file = new WaylandFileAdapter(policy, memory);
  const model = new WaylandModelAdapter(policy, memory);
  const http = new WaylandHttpAdapter(policy, memory);
  const browser = new MockBrowserAdapter();

  console.log('\n[E2E Violation Test] Testing policy enforcement\n');

  // Test shell violation
  try {
    await shell.execute('rm', ['-rf', '/']);
    assert.fail('Should have thrown SecurityViolationError');
  } catch (e: any) {
    assert.ok(e.name === 'SecurityViolationError', 'Should throw SecurityViolationError');
    console.log('✓ Shell violation blocked: rm -rf /');
  }

  // Test file write violation
  try {
    await file.write('./readonly/file.txt', 'content');
    assert.fail('Should have thrown SecurityViolationError');
  } catch (e: any) {
    assert.ok(e.name === 'SecurityViolationError', 'Should throw SecurityViolationError');
    console.log('✓ File violation blocked: write to readonly path');
  }

  // Test HTTP violation
  try {
    await http.get('https://example.com/api');
    assert.fail('Should have thrown SecurityViolationError');
  } catch (e: any) {
    assert.ok(e.name === 'SecurityViolationError', 'Should throw SecurityViolationError');
    console.log('✓ HTTP violation blocked: external domain');
  }

  // Test model options violation
  try {
    await model.invoke('test', { maxTokens: 1000000, temperature: 0.5 });
    assert.fail('Should have thrown SecurityViolationError');
  } catch (e: any) {
    assert.ok(e.name === 'SecurityViolationError', 'Should throw SecurityViolationError');
    console.log('✓ Model violation blocked: excessive token limit');
  }

  // Verify governance signals logged
  const events = memory.getEvents();
  const signals = events.filter((e) => e.type === 'GOVERNANCE_SIGNAL');
  assert.ok(signals.length > 0, 'Should log governance signals');
  assert.ok(signals.every((s) => s.status === 'failed'), 'All signals should indicate violation');
  console.log(`✓ Governance signals: ${signals.length} violations logged\n`);
});
