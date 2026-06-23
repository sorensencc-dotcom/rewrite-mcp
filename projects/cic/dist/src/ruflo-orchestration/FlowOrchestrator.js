/**
 * Ruflo Flow Orchestrator
 * Executes multi-agent flows and coordinates agent interactions
 */
import { EventEmitter } from "events";
import { CachedAgentClient } from "./CachedAgentClient.js";
/**
 * FlowOrchestrator executes flow templates with agent coordination
 */
export class FlowOrchestrator extends EventEmitter {
    constructor(config) {
        super();
        this.registry = config.registry;
        // Wrap agents with caching layer if cache provided
        if (config.cache) {
            this.agents = {};
            for (const [name, agent] of Object.entries(config.agents)) {
                this.agents[name] = new CachedAgentClient({
                    agent,
                    cache: config.cache,
                    ttl: config.cacheTtl,
                });
            }
        }
        else {
            this.agents = config.agents;
        }
        this.maxConcurrency = config.maxConcurrency || 10;
        this.defaultTimeout = config.defaultTimeout || 30000;
        this.activeExecutions = new Map();
    }
    /**
     * Execute a flow asynchronously and return the execution ID
     */
    async executeFlow(templateId, input, traceId) {
        const execution = await this.registry.startExecution(templateId, input, traceId);
        const executionId = execution.id;
        // Start execution asynchronously
        this.runExecution(executionId).catch(async (error) => {
            console.error(`Execution ${executionId} failed:`, error);
            const exec = this.registry.getExecution(executionId);
            if (exec) {
                await this.registry.updateExecution(executionId, { status: "failed" });
            }
        });
        return executionId;
    }
    /**
     * Wait for execution to complete (with timeout)
     */
    async waitForExecution(executionId, timeoutMs = 300000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const execution = this.registry.getExecution(executionId);
            if (!execution) {
                throw new Error(`Execution ${executionId} not found`);
            }
            if (execution.status === "completed" || execution.status === "failed") {
                return execution;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error(`Execution ${executionId} timed out after ${timeoutMs}ms`);
    }
    /**
     * Internal: run execution to completion
     */
    async runExecution(executionId) {
        const execution = this.registry.getExecution(executionId);
        if (!execution) {
            throw new Error(`Execution ${executionId} not found`);
        }
        const template = this.registry.getTemplate(execution.template_id);
        if (!template) {
            throw new Error(`Template ${execution.template_id} not found`);
        }
        // Check concurrency limit
        while (this.activeExecutions.size >= this.maxConcurrency) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.activeExecutions.set(executionId, true);
        await this.registry.updateExecution(executionId, {
            status: "running",
            started_at: new Date().toISOString(),
        });
        try {
            const stageOutputs = {};
            for (let i = 0; i < template.stages.length; i++) {
                const stage = template.stages[i];
                await this.registry.updateExecution(executionId, { stage_index: i });
                // Check conditional
                if (stage.if && !this.evaluateCondition(stage.if, stageOutputs)) {
                    await this.registry.updateExecution(executionId, {
                        stage_status: { ...execution.stage_status, [stage.id]: "skipped" },
                    });
                    continue;
                }
                try {
                    const stageOutput = await this.executeStage(executionId, stage, execution, stageOutputs);
                    stageOutputs[stage.id] = stageOutput;
                    await this.registry.updateExecution(executionId, {
                        stage_status: {
                            ...execution.stage_status,
                            [stage.id]: "completed",
                        },
                    });
                }
                catch (error) {
                    console.error(`Stage ${stage.id} failed:`, error);
                    if (stage.on_error === "continue") {
                        await this.registry.updateExecution(executionId, {
                            stage_status: { ...execution.stage_status, [stage.id]: "failed" },
                        });
                    }
                    else if (stage.on_error === "skip") {
                        await this.registry.updateExecution(executionId, {
                            stage_status: { ...execution.stage_status, [stage.id]: "skipped" },
                        });
                    }
                    else {
                        // fail
                        throw error;
                    }
                }
            }
            await this.registry.updateExecution(executionId, {
                status: "completed",
                completed_at: new Date().toISOString(),
                output: stageOutputs,
            });
            this.emit("execution_completed", { executionId, output: stageOutputs });
        }
        catch (error) {
            await this.registry.updateExecution(executionId, {
                status: "failed",
                completed_at: new Date().toISOString(),
            });
            this.emit("execution_failed", { executionId, error });
            throw error;
        }
        finally {
            this.activeExecutions.delete(executionId);
        }
    }
    /**
     * Execute a single stage (serial or parallel)
     */
    async executeStage(executionId, stage, // FlowStage type
    execution, stageOutputs) {
        if (stage.type === "serial") {
            const outputs = {};
            for (const task of stage.agents) {
                const result = await this.executeTask(executionId, stage.id, task);
                outputs[task.agent] = result;
            }
            return outputs;
        }
        else {
            // parallel
            const promises = stage.agents.map((task) => this.executeTask(executionId, stage.id, task));
            const results = await Promise.all(promises);
            const outputs = {};
            stage.agents.forEach((task, index) => {
                outputs[task.agent] = results[index];
            });
            return outputs;
        }
    }
    /**
     * Execute a single agent task
     */
    async executeTask(executionId, stageId, task // AgentTask type
    ) {
        const execution = this.registry.getExecution(executionId);
        if (!execution) {
            throw new Error(`Execution ${executionId} not found`);
        }
        const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        const now = new Date().toISOString();
        const span = {
            id: spanId,
            span_id: spanId,
            execution_id: executionId,
            stage_id: stageId,
            agent: task.agent,
            started_at: now,
            status: "running",
            trace_id: execution.trace_id,
        };
        await this.registry.recordSpan(executionId, span);
        const agent = this.agents[task.agent];
        if (!agent) {
            throw new Error(`Agent ${task.agent} not found`);
        }
        const timeout = task.timeout_ms || this.defaultTimeout;
        try {
            const input = this.interpolateInput(task.input, execution);
            const result = await Promise.race([
                agent.invoke(task.method, input, execution.trace_id),
                this.timeout(timeout),
            ]);
            span.status = "completed";
            span.completed_at = new Date().toISOString();
            span.duration_ms = Date.now() - startTime;
            return result;
        }
        catch (error) {
            span.status = "failed";
            span.error = error.message;
            span.completed_at = new Date().toISOString();
            span.duration_ms = Date.now() - startTime;
            throw error;
        }
    }
    /**
     * Interpolate template variables in input (e.g., {{input.foo}}, {{stages[0].output}})
     * Preserves arrays and objects; only stringifies when necessary for string replacement
     */
    interpolateInput(input, execution) {
        const interpolated = {};
        for (const [key, value] of Object.entries(input)) {
            if (typeof value === "string" && value.includes("{{")) {
                // Check if the entire value is a single template variable (preserve type)
                const singleVarMatch = value.match(/^\{\{(input|output|stages)\.([\w\[\]\.]+)\}\}$/);
                if (singleVarMatch) {
                    // Single variable: preserve its original type (array, object, string, etc.)
                    const [, varType, varPath] = singleVarMatch;
                    if (varType === "input") {
                        const val = execution.input[varPath];
                        interpolated[key] = val !== undefined ? val : "";
                    }
                    else if (varType === "output") {
                        const val = execution.output[varPath];
                        interpolated[key] = val !== undefined ? val : "";
                    }
                    else if (varType === "stages") {
                        // Handle {{stages[n].field}} patterns
                        const stagesMatch = varPath.match(/^stages\[(\d+)\]\.(\w+)$/);
                        if (stagesMatch) {
                            const [, idxStr, field] = stagesMatch;
                            const stageIndex = parseInt(idxStr, 10);
                            const stageId = `stage-${stageIndex}`;
                            if (execution.output) {
                                const stageOutput = execution.output[stageId];
                                if (stageOutput && typeof stageOutput === "object") {
                                    const val = stageOutput[field];
                                    interpolated[key] = val !== undefined ? val : "";
                                }
                                else {
                                    interpolated[key] = "";
                                }
                            }
                            else {
                                interpolated[key] = "";
                            }
                        }
                        else {
                            interpolated[key] = "";
                        }
                    }
                }
                else {
                    // Multiple variables or partial replacements: convert to strings
                    let result = value;
                    // Replace {{input.xxx}} with execution input values
                    result = result.replace(/\{\{input\.(\w+)\}\}/g, (_, field) => {
                        const val = execution.input[field];
                        return String(val ?? "");
                    });
                    // Replace {{output.xxx}} with stage outputs
                    result = result.replace(/\{\{output\.(\w+)\}\}/g, (_, field) => {
                        const val = execution.output[field];
                        return String(val ?? "");
                    });
                    // Replace {{stages[n].output}} patterns
                    result = result.replace(/\{\{stages\[(\d+)\]\.(\w+)\}\}/g, (_, idx, field) => {
                        const stageIndex = parseInt(idx, 10);
                        const stageId = `stage-${stageIndex}`;
                        if (execution.output) {
                            const stageOutput = execution.output[stageId];
                            if (stageOutput && typeof stageOutput === "object") {
                                return String(stageOutput[field] ?? "");
                            }
                        }
                        return "";
                    });
                    interpolated[key] = result;
                }
            }
            else if (Array.isArray(value)) {
                // Handle arrays: interpolate each element but preserve array structure
                interpolated[key] = value.map((item) => this.interpolateArrayItem(item, execution));
            }
            else if (typeof value === "object" && value !== null) {
                // Recursively interpolate nested objects
                interpolated[key] = this.interpolateInput(value, execution);
            }
            else {
                interpolated[key] = value;
            }
        }
        return interpolated;
    }
    /**
     * Interpolate a single array item while preserving its type
     */
    interpolateArrayItem(item, execution) {
        if (typeof item === "string" && item.includes("{{")) {
            // Interpolate string templates in array elements
            let result = item;
            result = result.replace(/\{\{input\.(\w+)\}\}/g, (_, field) => {
                const val = execution.input[field];
                return String(val ?? "");
            });
            result = result.replace(/\{\{output\.(\w+)\}\}/g, (_, field) => {
                const val = execution.output[field];
                return String(val ?? "");
            });
            result = result.replace(/\{\{stages\[(\d+)\]\.(\w+)\}\}/g, (_, idx, field) => {
                const stageIndex = parseInt(idx, 10);
                const stageId = `stage-${stageIndex}`;
                if (execution.output) {
                    const stageOutput = execution.output[stageId];
                    if (stageOutput && typeof stageOutput === "object") {
                        return String(stageOutput[field] ?? "");
                    }
                }
                return "";
            });
            return result;
        }
        else if (Array.isArray(item)) {
            // Recursively handle nested arrays
            return item.map((nested) => this.interpolateArrayItem(nested, execution));
        }
        else if (typeof item === "object" && item !== null) {
            // Recursively interpolate nested objects
            return this.interpolateInput(item, execution);
        }
        return item;
    }
    /**
     * Evaluate conditional expressions (simple comparison operators)
     */
    evaluateCondition(condition, stageOutputs) {
        if (!condition)
            return true;
        // Simple pattern matching: "outputKey == value" or "outputKey != value"
        const eqMatch = condition.match(/(\w+)\s*==\s*(.+)/);
        if (eqMatch) {
            const [, key, expectedValue] = eqMatch;
            const actualValue = stageOutputs[key] ?? "";
            return String(actualValue).trim() === expectedValue.trim();
        }
        const neMatch = condition.match(/(\w+)\s*!=\s*(.+)/);
        if (neMatch) {
            const [, key, expectedValue] = neMatch;
            const actualValue = stageOutputs[key] ?? "";
            return String(actualValue).trim() !== expectedValue.trim();
        }
        // Check existence: "outputKey"
        return stageOutputs[condition] !== undefined;
    }
    /**
     * Create a promise that resolves after delay
     */
    timeout(ms) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms));
    }
}
export default FlowOrchestrator;
//# sourceMappingURL=FlowOrchestrator.js.map