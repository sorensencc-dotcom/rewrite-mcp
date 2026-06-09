import { AutonomousPlanner, PlannerInputs } from './autonomous-planner.js';
import { TaskToOperationsConverter } from './task-to-operations.js';
import { RuntimeExecutor } from '../cro/runtime-executor.js';
import { TaskExecution } from '../cro/types.js';
import { PlanningPlan, PlanningTask } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface PlanExecutionResult {
  planId: string;
  goalCount: number;
  taskCount: number;
  executedTasks: number;
  failedTasks: number;
  results: Array<{
    taskId: string;
    status: 'success' | 'failed';
    error?: string;
    duration: number;
  }>;
}

export class PlannerExecutorBridge {
  private converter: TaskToOperationsConverter;

  constructor(
    private planner: AutonomousPlanner,
    private executor: RuntimeExecutor
  ) {
    this.converter = new TaskToOperationsConverter();
  }

  async executePlan(inputs: PlannerInputs): Promise<PlanExecutionResult> {
    const plan = this.planner.plan(inputs);
    const planId = uuidv4();
    const results: PlanExecutionResult['results'] = [];
    let executedTasks = 0;
    let failedTasks = 0;

    for (const task of plan.tasks) {
      try {
        const startTime = Date.now();
        await this.executeTask(task, planId);
        const duration = Date.now() - startTime;

        results.push({
          taskId: task.id,
          status: 'success',
          duration,
        });
        executedTasks++;
      } catch (err: any) {
        const duration = Date.now();
        results.push({
          taskId: task.id,
          status: 'failed',
          error: err.message,
          duration,
        });
        failedTasks++;
      }
    }

    return {
      planId,
      goalCount: plan.goals.length,
      taskCount: plan.tasks.length,
      executedTasks,
      failedTasks,
      results,
    };
  }

  private async executeTask(task: PlanningTask, planId: string): Promise<void> {
    const mapping = this.converter.convert(task);

    const taskExecution: TaskExecution = {
      taskId: task.id,
      aprPlanId: planId,
      goalId: task.goalId,
      title: task.title,
      description: task.description,
      type: task.type,
      adapterOps: mapping.operations,
      waylandSessionId: `session:${planId}:${task.id}`,
      expectedDuration: mapping.estimatedDuration,
      isDryRun: false,
    };

    await this.executor.runBatch([taskExecution], false);
  }

  getPlan(inputs: PlannerInputs): PlanningPlan {
    return this.planner.plan(inputs);
  }
}
