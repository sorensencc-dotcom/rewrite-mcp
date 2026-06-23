// CIC WIL — Wayland Adapter integration for CRO task execution
// Routes CRO tasks through WIL adapters with SecurityPolicy enforcement
import { SecurityPolicy } from '../../wil/src/security/SecurityPolicy.js';
export class WaylandAdapterRunner {
    constructor(adapters, securityConfig, memory) {
        this.adapters = adapters;
        this.policy = new SecurityPolicy(securityConfig);
        this.memory = memory;
    }
    async run(task, isDryRun) {
        if (isDryRun) {
            return {
                ok: true,
                dryRun: true,
                message: `Dry-run execution of task ${task.taskId} with adapters completed successfully.`,
            };
        }
        if (!task.adapterOps || task.adapterOps.length === 0) {
            return {
                ok: true,
                message: `Task ${task.taskId} has no adapter operations.`,
            };
        }
        const results = [];
        for (const op of task.adapterOps) {
            try {
                const startTime = Date.now();
                const result = await this.executeAdapterOperation(op, task);
                const durationMs = Date.now() - startTime;
                results.push({ success: true, op: op.type, result, durationMs });
                // Adapters already log successful calls and governance signals
            }
            catch (err) {
                results.push({ success: false, op: op.type, error: err.message });
                // Adapters already log governance signals on violation
                throw err; // Fail the task on first adapter violation
            }
        }
        return {
            ok: true,
            taskId: task.taskId,
            operationCount: results.length,
            results,
        };
    }
    async executeAdapterOperation(op, task) {
        switch (op.type) {
            case 'shell':
                return await this.adapters.shell.execute(op.args?.command, op.args?.argv);
            case 'file':
                if (op.operation === 'read') {
                    return await this.adapters.file.read(op.args?.path);
                }
                else if (op.operation === 'write') {
                    return await this.adapters.file.write(op.args?.path, op.args?.content);
                }
                else if (op.operation === 'list') {
                    return await this.adapters.file.list(op.args?.path);
                }
                break;
            case 'http':
                if (op.operation === 'get') {
                    return await this.adapters.http.get(op.args?.url);
                }
                else if (op.operation === 'post') {
                    return await this.adapters.http.post(op.args?.url, op.args?.body);
                }
                break;
            case 'model':
                return await this.adapters.model.invoke(op.args?.modelName, op.args?.options);
            default:
                throw new Error(`Unsupported adapter type: ${op.type}`);
        }
    }
}
//# sourceMappingURL=wayland-adapter-runner.js.map