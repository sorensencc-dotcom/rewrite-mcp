export class TaskToOperationsConverter {
    convert(task) {
        const operations = [];
        const estimatedDuration = this.estimateDuration(task);
        switch (task.type) {
            case 'AUTO_EXECUTABLE':
                operations.push(...this.generateAutoExecutableOps(task));
                break;
            case 'OPERATOR_REQUIRED':
                operations.push(...this.generateOperatorRequiredOps(task));
                break;
            default:
                operations.push({
                    type: 'shell',
                    operation: 'echo',
                    args: { command: `Task: ${task.title}` },
                });
        }
        return {
            taskId: task.id,
            taskType: task.type,
            operations,
            estimatedDuration,
        };
    }
    generateAutoExecutableOps(task) {
        const ops = [];
        if (task.title.includes('retry') || task.title.includes('safeguard')) {
            ops.push({
                type: 'shell',
                operation: 'execute',
                args: {
                    command: 'echo',
                    argv: [`Implementing retry safeguards for: ${task.description}`],
                },
            });
        }
        if (task.title.includes('Jaccard') || task.title.includes('drift')) {
            ops.push({
                type: 'shell',
                operation: 'execute',
                args: {
                    command: 'echo',
                    argv: ['Running drift detection with Jaccard indices'],
                },
            });
            ops.push({
                type: 'model',
                operation: 'invoke',
                args: {
                    modelName: 'claude-opus',
                    prompt: `Analyze prompt template drift. Task: ${task.description}`,
                    options: { maxTokens: 1000 },
                },
            });
        }
        if (task.title.includes('smoke') || task.title.includes('check')) {
            ops.push({
                type: 'shell',
                operation: 'execute',
                args: {
                    command: 'echo',
                    argv: ['Running system health checks'],
                },
            });
            ops.push({
                type: 'file',
                operation: 'list',
                args: { path: '/tmp' },
            });
        }
        return ops.length > 0
            ? ops
            : [
                {
                    type: 'shell',
                    operation: 'echo',
                    args: { command: `AUTO_EXECUTABLE: ${task.title}` },
                },
            ];
    }
    generateOperatorRequiredOps(task) {
        return [
            {
                type: 'shell',
                operation: 'echo',
                args: {
                    command: `OPERATOR_REQUIRED: ${task.title}`,
                    argv: [`Description: ${task.description}`],
                },
            },
        ];
    }
    estimateDuration(task) {
        if (task.type === 'OPERATOR_REQUIRED') {
            return 600000;
        }
        return 30000;
    }
}
//# sourceMappingURL=task-to-operations.js.map