import { test, expect, describe } from 'vitest';
import { GovernanceGating } from '../../src/cro/governance-gating.js';
import { TaskExecution } from '../../src/cro/types.js';

describe('Phase 28.4 — Governance Council Gating', () => {
  const gating = new GovernanceGating();

  test('LOW risk tasks assessed correctly', () => {
    const task: TaskExecution = {
      taskId: 'task:safe',
      goalId: 'goal:test',
      title: 'Safe Operation',
      adapterOps: [
        {
          type: 'shell',
          operation: 'echo',
          args: { command: 'echo "hello"' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(assessment.riskLevel).toBe('LOW');
    expect(assessment.requiresApproval).toBe(false);
  });

  test('CRITICAL risk tasks blocked', () => {
    const task: TaskExecution = {
      taskId: 'task:dangerous',
      goalId: 'goal:test',
      title: 'Dangerous Operation',
      adapterOps: [
        {
          type: 'shell',
          operation: 'execute',
          args: { command: 'rm -rf /' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(assessment.riskLevel).toBe('CRITICAL');
    expect(assessment.requiresApproval).toBe(true);
    expect(assessment.riskFactors.length).toBeGreaterThan(0);
  });

  test('HIGH risk file operations flagged', () => {
    const task: TaskExecution = {
      taskId: 'task:system-file',
      goalId: 'goal:test',
      title: 'System File Modification',
      adapterOps: [
        {
          type: 'file',
          operation: 'write',
          args: { path: '/etc/shadow' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(assessment.riskLevel).toBe('HIGH');
    expect(assessment.requiresApproval).toBe(true);
  });

  test('HTTP unencrypted requests flagged as MEDIUM risk', () => {
    const task: TaskExecution = {
      taskId: 'task:http',
      goalId: 'goal:test',
      title: 'HTTP Request',
      adapterOps: [
        {
          type: 'http',
          operation: 'get',
          args: { url: 'http://insecure.example.com' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(['MEDIUM', 'HIGH']).toContain(assessment.riskLevel);
  });

  test('Model with excessive tokens flagged', () => {
    const task: TaskExecution = {
      taskId: 'task:model',
      goalId: 'goal:test',
      title: 'Model Invocation',
      adapterOps: [
        {
          type: 'model',
          operation: 'invoke',
          args: { modelName: 'claude', options: { maxTokens: 10000 } },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(['MEDIUM', 'HIGH']).toContain(assessment.riskLevel);
  });

  test('Governance decision with council votes', () => {
    const task: TaskExecution = {
      taskId: 'task:vote-test',
      goalId: 'goal:test',
      title: 'Governance Vote Test',
      adapterOps: [
        {
          type: 'shell',
          operation: 'execute',
          args: { command: 'rm -rf /tmp/test' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    const decision = gating.makeDecision(assessment, {
      approve: 3,
      reject: 1,
      abstain: 0,
    });

    expect(decision.decision).toBe('APPROVED');
    expect(decision.councilVotes?.approve).toBe(3);
  });

  test('Council rejection overrides approval', () => {
    const task: TaskExecution = {
      taskId: 'task:rejected',
      goalId: 'goal:test',
      title: 'Governance Rejection Test',
      adapterOps: [
        {
          type: 'shell',
          operation: 'execute',
          args: { command: 'rm -rf /data' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    const decision = gating.makeDecision(assessment, {
      approve: 1,
      reject: 3,
      abstain: 0,
    });

    expect(decision.decision).toBe('REJECTED');
  });

  test('Gate execution allows/denies based on risk', () => {
    const safTask: TaskExecution = {
      taskId: 'task:safe-gate',
      goalId: 'goal:test',
      title: 'Safe',
      adapterOps: [
        {
          type: 'shell',
          operation: 'echo',
          args: { command: 'echo safe' },
        },
      ],
    };

    const safeResult = gating.gateExecution(safTask);
    expect(safeResult.canExecute).toBe(true);

    const criticalTask: TaskExecution = {
      taskId: 'task:critical-gate',
      goalId: 'goal:test',
      title: 'Critical',
      adapterOps: [
        {
          type: 'shell',
          operation: 'execute',
          args: { command: 'sudo rm -rf /' },
        },
      ],
    };

    const criticalResult = gating.gateExecution(criticalTask);
    expect(criticalResult.canExecute).toBe(false);
  });

  test('Risk assessment with multiple operations', () => {
    const task: TaskExecution = {
      taskId: 'task:multi-op',
      goalId: 'goal:test',
      title: 'Multiple Operations',
      adapterOps: [
        {
          type: 'shell',
          operation: 'echo',
          args: { command: 'echo test' },
        },
        {
          type: 'file',
          operation: 'read',
          args: { path: '/var/log/syslog' },
        },
        {
          type: 'http',
          operation: 'get',
          args: { url: 'https://api.example.com' },
        },
      ],
    };

    const assessment = gating.assessRisk(task);
    expect(assessment.riskLevel).toBe('LOW');
  });

  test('Empty task has no risk', () => {
    const task: TaskExecution = {
      taskId: 'task:empty',
      goalId: 'goal:test',
      title: 'Empty',
    };

    const assessment = gating.assessRisk(task);
    expect(assessment.riskLevel).toBe('LOW');
    expect(assessment.requiresApproval).toBe(false);
  });
});
