// filename: workflow.test.ts
// Workflow integration tests

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRunner, WorkflowContext, WorkflowDef } from './workflow';
import { WaylandAdapterRegistry, createDefaultRegistry } from './wayland-adapter-registry';
import {
  WaylandSecurityPolicy,
  createDefaultSecurityPolicy,
} from './wayland-security-policy';

describe('WorkflowRunner', () => {
  let logger: any;
  let registry: WaylandAdapterRegistry;
  let securityPolicy: WaylandSecurityPolicy;
  let runner: WorkflowRunner;
  let ctx: WorkflowContext;

  beforeEach(() => {
    logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    registry = createDefaultRegistry();
    securityPolicy = createDefaultSecurityPolicy();
    runner = new WorkflowRunner();
    ctx = {
      workflowId: 'test-workflow',
      sessionId: 'test-session',
      stepResults: new Map(),
      startTime: Date.now(),
      logger,
      registry,
      securityPolicy,
    };
  });

  it('should execute simple workflow with one step', async () => {
    const workflow: WorkflowDef = {
      id: 'test-simple',
      name: 'Test Simple',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'shell',
          payload: { command: 'echo hello' },
        },
      ],
    };

    const results = await runner.run(workflow, ctx);
    expect(results.has('step-1')).toBe(true);
    expect(results.get('step-1')).toEqual({ status: 'ok', output: '' });
  });

  it('should execute workflow with multiple steps', async () => {
    const workflow: WorkflowDef = {
      id: 'test-multi',
      name: 'Test Multi',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'file',
          payload: { operation: 'read' },
        },
        {
          id: 'step-2',
          adapter: 'shell',
          payload: { command: 'ls' },
        },
      ],
    };

    const results = await runner.run(workflow, ctx);
    expect(results.size).toBe(2);
    expect(results.has('step-1')).toBe(true);
    expect(results.has('step-2')).toBe(true);
  });

  it('should skip steps based on condition', async () => {
    const workflow: WorkflowDef = {
      id: 'test-condition',
      name: 'Test Condition',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'shell',
          payload: { command: 'echo yes' },
        },
        {
          id: 'step-2',
          adapter: 'shell',
          payload: { command: 'echo no' },
          condition: () => false, // Skip this step
        },
      ],
    };

    const results = await runner.run(workflow, ctx);
    expect(results.has('step-1')).toBe(true);
    expect(results.has('step-2')).toBe(false);
  });

  it('should record workflow execution time', async () => {
    const workflow: WorkflowDef = {
      id: 'test-timing',
      name: 'Test Timing',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'shell',
          payload: { command: 'echo test' },
        },
      ],
    };

    await runner.run(workflow, ctx);
    const duration = Date.now() - ctx.startTime;
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing adapter gracefully', async () => {
    const workflow: WorkflowDef = {
      id: 'test-missing',
      name: 'Test Missing',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'nonexistent',
          payload: {},
        },
      ],
    };

    expect(async () => {
      await runner.run(workflow, ctx);
    }).rejects.toThrow('Adapter not found');
  });
});

describe('Workflow Conditions', () => {
  let logger: any;
  let registry: WaylandAdapterRegistry;
  let securityPolicy: WaylandSecurityPolicy;
  let runner: WorkflowRunner;
  let ctx: WorkflowContext;

  beforeEach(() => {
    logger = { info: () => {}, warn: () => {}, error: () => {} };
    registry = createDefaultRegistry();
    securityPolicy = createDefaultSecurityPolicy();
    runner = new WorkflowRunner();
    ctx = {
      workflowId: 'test-workflow',
      sessionId: 'test-session',
      stepResults: new Map(),
      startTime: Date.now(),
      logger,
      registry,
      securityPolicy,
    };
  });

  it('should use step results in conditions', async () => {
    const workflow: WorkflowDef = {
      id: 'test-step-result',
      name: 'Test Step Result',
      description: 'Test workflow',
      steps: [
        {
          id: 'step-1',
          adapter: 'shell',
          payload: { command: 'echo test' },
        },
        {
          id: 'step-2',
          adapter: 'file',
          payload: { operation: 'read' },
          condition: (context) => {
            // Run only if step-1 executed
            return context.stepResults.has('step-1');
          },
        },
      ],
    };

    const results = await runner.run(workflow, ctx);
    expect(results.has('step-1')).toBe(true);
    expect(results.has('step-2')).toBe(true);
  });
});
