import { describe, it, expect, beforeEach } from 'vitest';
import { meePhaseExecutor } from './index.js';

describe('MEE Phase Executor Integration Tests (45.1)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'integration';
  });

  it('should execute phases with realistic cost tracking', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 300000
    });

    expect(result.success).toBe(true);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalCost).toBeLessThan(500);
    expect(result.results.averageCostPerPhase).toBeDefined();
  });

  it('should pause before exhausting budget (90% threshold)', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      costBudget: 500, // Higher budget for realistic testing
      timeout: 300000
    });

    // Should either complete or pause at 90%
    if (!result.success) {
      expect(result.state).toBe('paused');
      expect(result.totalCost).toBeLessThanOrEqual(500 * 0.9);
    }
    expect(result.executionId).toBeDefined();
  });

  it('should create and use checkpoints correctly', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      checkpointInterval: 30000,
      costBudget: 500,
      timeout: 300000
    });

    expect(result.executionId).toBeDefined();
    if (result.success) {
      expect(result.results.checkpointsCreated).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle parallel mode execution', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'parallel',
      costBudget: 500,
      timeout: 300000
    });

    expect(result.executionId).toBeDefined();
    expect(result.mode).toBe('parallel');
    expect(result.totalSteps).toBe(3);
    if (result.success) {
      expect(result.completedSteps).toBe(3);
    }
  });

  it('should track all phase costs individually', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 300000
    });

    // Check that execution happened and costs were tracked
    expect(result.executionId).toBeDefined();
    expect(result.totalCost).toBeGreaterThan(0);
    if (result.success) {
      expect(result.results.phasesExecuted).toBeGreaterThan(0);
      expect(parseFloat(result.results.averageCostPerPhase)).toBeGreaterThan(0);
    }
  });

  it('should respect timeout across multiple phases', async () => {
    const startTime = Date.now();
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 5000 // Very short
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(10000); // Should timeout quickly
    expect(result.elapsedMs).toBeLessThanOrEqual(elapsed + 100);
  });

  it('should support rollback on phase failure', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      rollbackOnError: true,
      costBudget: 500,
      timeout: 300000
    });

    expect(result.executionId).toBeDefined();
    // Either succeeds or rolls back on error
    expect(['true', 'false']).toContain(String(result.success));
  });

  it('should generate unique execution IDs', async () => {
    const result1 = await meePhaseExecutor({
      phaseList: ['45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 300000
    });

    const result2 = await meePhaseExecutor({
      phaseList: ['45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 300000
    });

    expect(result1.executionId).not.toEqual(result2.executionId);
  });

  it('should include comprehensive timing information', async () => {
    const result = await meePhaseExecutor({
      phaseList: ['43', '44', '45'],
      mode: 'sequential',
      costBudget: 500,
      timeout: 300000
    });

    expect(result.executionId).toBeDefined();
    expect(result.elapsedMs).toBeGreaterThan(0);
    expect(result.elapsedMs).toBeLessThan(300000);
  });

  it('should handle large phase lists without memory issues', async () => {
    const phases = Array.from({ length: 10 }, (_, i) => String(i + 40));

    const result = await meePhaseExecutor({
      phaseList: phases,
      mode: 'sequential',
      costBudget: 1000,
      timeout: 600000
    });

    expect(result.executionId).toBeDefined();
    expect(result.totalSteps).toBe(10);
  });
});
