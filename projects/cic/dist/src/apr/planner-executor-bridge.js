import { TaskToOperationsConverter } from './task-to-operations.js';
import { v4 as uuidv4 } from 'uuid';
export class PlannerExecutorBridge {
    constructor(planner, executor) {
        this.planner = planner;
        this.executor = executor;
        this.converter = new TaskToOperationsConverter();
    }
    async executePlan(inputs) {
        const plan = this.planner.plan(inputs);
        const planId = uuidv4();
        const results = [];
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
            }
            catch (err) {
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
    async executeTask(task, planId) {
        const mapping = this.converter.convert(task);
        const taskExecution = {
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
    getPlan(inputs) {
        return this.planner.plan(inputs);
    }
}
//# sourceMappingURL=planner-executor-bridge.js.map