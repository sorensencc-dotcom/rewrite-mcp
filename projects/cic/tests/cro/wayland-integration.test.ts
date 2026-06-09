// Phase 28.1 — CRO ↔ Wayland Adapter Integration Tests

import { test } from 'node:test';
import * as assert from 'node:assert';
import path from 'node:path';
import { RuntimeExecutor } from '../../src/cro/runtime-executor.js';
import { WaylandShellAdapter } from '../../wil/src/runtime/adapters/WaylandShellAdapter.js';
import { WaylandFileAdapter } from '../../wil/src/runtime/adapters/WaylandFileAdapter.js';
import { WaylandHttpAdapter } from '../../wil/src/runtime/adapters/WaylandHttpAdapter.js';
import { WaylandModelAdapter } from '../../wil/src/runtime/adapters/WaylandModelAdapter.js';
import { SecurityPolicy } from '../../wil/src/security/SecurityPolicy.js';
import { MemoryStore } from '../../wil/src/memory/MemoryStore.js';
import { TaskExecution } from '../../src/cro/types.js';

test('Phase 28.1 — CRO routes tasks through WaylandAdapterRunner with SecurityPolicy enforcement', async () => {
  const securityConfig = {
    shell: {
      allowedCommands: ['echo', 'ls', 'git status'],
      deniedPatterns: ['^rm\\s+(-r|-f)', '^dd\\s+'],
    },
    file: {
      allowedRoots: ['./docs', './data'],
      readOnlyRoots: ['./vendor'],
    },
    http: {
      allowedDomains: ['localhost', 'github.com'],
    },
    model: {
      maxTokens: 100000,
      temperatureMax: 1.0,
    },
  };

  const policy = new SecurityPolicy(securityConfig);
  const memory = new MemoryStore();

  const adapters = {
    shell: new WaylandShellAdapter(policy, memory),
    file: new WaylandFileAdapter(policy, memory),
    http: new WaylandHttpAdapter(policy, memory),
    model: new WaylandModelAdapter(policy, memory),
  };

  const executor = new RuntimeExecutor(
    path.resolve(new URL('.', import.meta.url).pathname, '../../..'),
    adapters,
    securityConfig,
    memory
  );

  // Task with adapter operations
  const task: TaskExecution = {
    taskId: 'cro_wil_001',
    goalId: 'goal_001',
    title: 'Query system via adapters',
    status: 'pending',
    owner: 'agent:WaylandAgent',
    retryCount: 0,
    waylandSessionId: 'wayland_cro_session_001',
    adapterOps: [
      {
        type: 'shell',
        operation: 'execute',
        args: { command: 'echo', argv: ['Hello from CRO'] },
      },
      {
        type: 'file',
        operation: 'list',
        args: { path: './docs' },
      },
      {
        type: 'http',
        operation: 'get',
        args: { url: 'https://localhost:3000/api' },
      },
      {
        type: 'model',
        operation: 'invoke',
        args: { modelName: 'gpt-4', options: { maxTokens: 1000, temperature: 0.7 } },
      },
    ],
  };

  // Execute task with dry-run first
  console.log('\n[CRO Integration Test] Starting dry-run...');
  const dryRunEpisode = await executor.runBatch([task], true);
  assert.strictEqual(dryRunEpisode.status, 'dry_run', 'Should be dry-run status');
  assert.strictEqual(dryRunEpisode.tasks[0].status, 'completed', 'Dry-run should complete');

  // Execute task with real adapters
  console.log('[CRO Integration Test] Executing with real adapters...');
  const episode = await executor.runBatch([task], false);

  // Verify execution result
  assert.strictEqual(episode.status, 'committed', 'Should be committed status');
  assert.strictEqual(episode.tasks.length, 1, 'Should have 1 task');
  assert.ok(episode.tasks[0].result, 'Task should have result');
  assert.ok(episode.tasks[0].result.operationCount >= 0, 'Should report operation count');

  console.log(`✓ CRO executed ${episode.tasks[0].result.operationCount} adapter operations`);

  // Verify MLA events logged
  const events = executor.getMemoryEvents();
  assert.ok(events.length > 0, 'Should have MLA events');

  const adapterEvents = events.filter((e) => e.type === 'ADAPTER_CALL');
  assert.ok(adapterEvents.length > 0, 'Should have ADAPTER_CALL events');

  const telemetryEvents = events.filter(
    (e) => e.type === 'AGENT_TELEMETRY' && e.taskId === task.taskId
  );
  assert.ok(telemetryEvents.length > 0, 'Should have AGENT_TELEMETRY for task');

  console.log(`✓ MLA logged ${events.length} events (${adapterEvents.length} adapter calls)`);

  // Verify session correlation
  const sessionCorrelatedEvents = events.filter((e) => e.waylandSessionId === task.waylandSessionId);
  assert.ok(sessionCorrelatedEvents.length > 0, 'Should correlate events to session');
  console.log(`✓ Session correlation: ${sessionCorrelatedEvents.length} events → ${task.waylandSessionId}`);

  console.log('[CRO Integration Test] ✓ Full cycle passed\n');
});

test('Phase 28.1 — CRO policy violations blocked in task execution', async () => {
  const securityConfig = {
    shell: {
      allowedCommands: ['echo'],
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

  const adapters = {
    shell: new WaylandShellAdapter(policy, memory),
    file: new WaylandFileAdapter(policy, memory),
    http: new WaylandHttpAdapter(policy, memory),
    model: new WaylandModelAdapter(policy, memory),
  };

  const executor = new RuntimeExecutor(
    path.resolve(new URL('.', import.meta.url).pathname, '../../..'),
    adapters,
    securityConfig,
    memory
  );

  // Task with policy-violating operation
  const violationTask: TaskExecution = {
    taskId: 'cro_violation_001',
    goalId: 'goal_001',
    title: 'Violate shell policy',
    status: 'pending',
    owner: 'agent:WaylandAgent',
    retryCount: 0,
    waylandSessionId: 'wayland_violation_session',
    adapterOps: [
      {
        type: 'shell',
        operation: 'execute',
        args: { command: 'rm', argv: ['-rf', '/'] },
      },
    ],
  };

  console.log('\n[CRO Violation Test] Executing policy violation...');
  const episode = await executor.runBatch([violationTask], false);

  // Task should fail due to policy violation
  assert.strictEqual(episode.tasks[0].status, 'failed', 'Task should fail on policy violation');
  assert.ok(episode.tasks[0].error, 'Should have error message');

  console.log(`✓ Policy violation blocked: ${episode.tasks[0].error}`);

  // Verify governance signals logged
  const events = executor.getMemoryEvents();
  const signals = events.filter((e) => e.type === 'GOVERNANCE_SIGNAL');
  assert.ok(signals.length > 0, 'Should log governance signal for violation');
  assert.ok(signals.some((s) => s.metadata?.blocked === true), 'Signal should indicate violation');

  console.log(`✓ Governance signal logged: ${signals.length} violation(s)`);
  console.log('[CRO Violation Test] ✓ Policy enforcement working\n');
});

test('Phase 28.1 — CRO backward compatible with CoreAgentRunner (no adapters)', async () => {
  // Create executor WITHOUT adapters — should use CoreAgentRunner
  const executor = new RuntimeExecutor(
    path.resolve(new URL('.', import.meta.url).pathname, '../../..')
  );

  const task: TaskExecution = {
    taskId: 'cro_core_001',
    goalId: 'goal_001',
    title: 'Legacy task execution',
    status: 'pending',
    owner: 'agent:TokenEconomyAgent',
    retryCount: 0,
  };

  console.log('\n[CRO Backward Compat Test] Executing legacy task (no adapters)...');
  const episode = await executor.runBatch([task], false);

  assert.strictEqual(episode.tasks[0].status, 'completed', 'Legacy task should complete');
  assert.ok(episode.tasks[0].result, 'Should have result');
  assert.ok(episode.tasks[0].result.action, 'Should use CoreAgentRunner result');

  console.log(`✓ Legacy task completed: ${episode.tasks[0].result.action}`);
  console.log('[CRO Backward Compat Test] ✓ Backward compatibility maintained\n');
});
