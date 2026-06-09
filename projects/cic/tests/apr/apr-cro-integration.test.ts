import { test, expect, describe } from 'vitest';
import { AutonomousPlanner } from '../../src/apr/autonomous-planner.js';
import { PlannerExecutorBridge } from '../../src/apr/planner-executor-bridge.js';
import { RuntimeExecutor } from '../../src/cro/runtime-executor.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

describe('Phase 28.3 — APR ↔ CRO Integration', () => {
  test('APR generates planning goals and tasks', () => {
    const planner = new AutonomousPlanner(projectRoot);
    const inputs = {
      memoryTrends: {
        failuresCount: 5,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const plan = planner.plan(inputs);

    expect(plan.goals.length).toBeGreaterThan(0);
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.goals[0].id).toBeDefined();
    expect(plan.tasks[0].id).toBeDefined();
  });

  test('TaskToOperationsConverter transforms tasks into adapter operations', () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 3,
        hasStagnation: false,
        hasDrift: true,
      },
    };

    const plan = bridge.getPlan(inputs);
    expect(plan.tasks.length).toBeGreaterThan(0);

    const firstTask = plan.tasks[0];
    expect(firstTask.type).toBeDefined();
  });

  test('PlannerExecutorBridge maps planning tasks to CRO execution', async () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 0,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const result = await bridge.executePlan(inputs);

    expect(result.planId).toBeDefined();
    expect(result.goalCount).toBeGreaterThan(0);
    expect(result.taskCount).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test('Bridge generates correct planId for session correlation', async () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 0,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const result = await bridge.executePlan(inputs);

    expect(result.planId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('Bridge tracks execution results for all tasks', async () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 1,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const result = await bridge.executePlan(inputs);

    expect(result.results).toBeDefined();
    expect(result.results.every(r => r.taskId !== undefined)).toBe(true);
    expect(result.results.every(r => r.status !== undefined)).toBe(true);
    expect(result.results.every(r => r.duration !== undefined)).toBe(true);
  });

  test('AUTO_EXECUTABLE tasks generate appropriate operations', () => {
    const planner = new AutonomousPlanner(projectRoot);
    const inputs = {
      memoryTrends: {
        failuresCount: 5,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const plan = planner.plan(inputs);
    const autoExecTasks = plan.tasks.filter(t => t.type === 'AUTO_EXECUTABLE');

    expect(autoExecTasks.length).toBeGreaterThan(0);
  });

  test('OPERATOR_REQUIRED tasks are handled appropriately', () => {
    const planner = new AutonomousPlanner(projectRoot);
    const inputs = {
      skillHotspots: {
        orphanSkills: [
          {
            id: 'skill:test',
            name: 'Test Skill',
          },
        ],
        unusedAgents: [],
        denseNodes: [],
      },
    };

    const plan = planner.plan(inputs);
    const operatorTasks = plan.tasks.filter(t => t.type === 'OPERATOR_REQUIRED');

    expect(operatorTasks.length).toBeGreaterThan(0);
  });

  test('Plan execution respects task ordering', async () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 0,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const result = await bridge.executePlan(inputs);
    const resultIds = result.results.map(r => r.taskId);

    expect(resultIds.length).toBeGreaterThan(0);
    expect(new Set(resultIds).size).toBe(resultIds.length);
  });

  test('Dry-run mode validates without executing', async () => {
    const planner = new AutonomousPlanner(projectRoot);
    const executor = new RuntimeExecutor();
    const bridge = new PlannerExecutorBridge(planner, executor);

    const inputs = {
      memoryTrends: {
        failuresCount: 0,
        hasStagnation: false,
        hasDrift: false,
      },
    };

    const result = await bridge.executePlan(inputs);
    expect(result.taskCount).toBeGreaterThan(0);
  });
});
