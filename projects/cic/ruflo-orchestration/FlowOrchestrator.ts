/**
 * Ruflo Flow Orchestrator
 * Executes multi-agent flows and coordinates agent interactions
 */

import { EventEmitter } from "events";
import { FlowRegistry, FlowExecution, FlowSpan } from "./FlowRegistry";

export interface AgentClient {
  invoke(
    method: string,
    input: Record<string, unknown>,
    traceId: string
  ): Promise<Record<string, unknown>>;
}

export interface OrchestratorConfig {
  registry: FlowRegistry;
  agents: Record<string, AgentClient>;
  maxConcurrency?: number;
  defaultTimeout?: number;
}

/**
 * FlowOrchestrator executes flow templates with agent coordination
 */
export class FlowOrchestrator extends EventEmitter {
  private registry: FlowRegistry;
  private agents: Record<string, AgentClient>;
  private maxConcurrency: number;
  private defaultTimeout: number;
  private activeExecutions: Map<string, boolean>;

  constructor(config: OrchestratorConfig) {
    super();
    this.registry = config.registry;
    this.agents = config.agents;
    this.maxConcurrency = config.maxConcurrency || 10;
    this.defaultTimeout = config.defaultTimeout || 30000;
    this.activeExecutions = new Map();
  }

  /**
   * Execute a flow asynchronously and return the execution ID
   */
  async executeFlow(
    templateId: string,
    input: Record<string, unknown>,
    traceId: string
  ): Promise<string> {
    const execution = this.registry.startExecution(templateId, input, traceId);
    const executionId = execution.id;

    // Start execution asynchronously
    this.runExecution(executionId).catch((error) => {
      console.error(`Execution ${executionId} failed:`, error);
      const exec = this.registry.getExecution(executionId);
      if (exec) {
        this.registry.updateExecution(executionId, { status: "failed" });
      }
    });

    return executionId;
  }

  /**
   * Wait for execution to complete (with timeout)
   */
  async waitForExecution(
    executionId: string,
    timeoutMs: number = 300000
  ): Promise<FlowExecution> {
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
  private async runExecution(executionId: string): Promise<void> {
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
    this.registry.updateExecution(executionId, {
      status: "running",
      started_at: new Date().toISOString(),
    });

    try {
      const stageOutputs: Record<string, Record<string, unknown>> = {};

      for (let i = 0; i < template.stages.length; i++) {
        const stage = template.stages[i];
        this.registry.updateExecution(executionId, { stage_index: i });

        // Check conditional
        if (stage.if && !this.evaluateCondition(stage.if, stageOutputs)) {
          this.registry.updateExecution(executionId, {
            stage_status: { ...execution.stage_status, [stage.id]: "skipped" },
          });
          continue;
        }

        try {
          const stageOutput = await this.executeStage(
            executionId,
            stage,
            execution,
            stageOutputs
          );
          stageOutputs[stage.id] = stageOutput;

          this.registry.updateExecution(executionId, {
            stage_status: {
              ...execution.stage_status,
              [stage.id]: "completed",
            },
          });
        } catch (error) {
          console.error(`Stage ${stage.id} failed:`, error);

          if (stage.on_error === "continue") {
            this.registry.updateExecution(executionId, {
              stage_status: { ...execution.stage_status, [stage.id]: "failed" },
            });
          } else if (stage.on_error === "skip") {
            this.registry.updateExecution(executionId, {
              stage_status: { ...execution.stage_status, [stage.id]: "skipped" },
            });
          } else {
            // fail
            throw error;
          }
        }
      }

      this.registry.updateExecution(executionId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        output: stageOutputs,
      });

      this.emit("execution_completed", { executionId, output: stageOutputs });
    } catch (error) {
      this.registry.updateExecution(executionId, {
        status: "failed",
        completed_at: new Date().toISOString(),
      });
      this.emit("execution_failed", { executionId, error });
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single stage (serial or parallel)
   */
  private async executeStage(
    executionId: string,
    stage: any, // FlowStage type
    execution: FlowExecution,
    stageOutputs: Record<string, Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    if (stage.type === "serial") {
      const outputs: Record<string, unknown> = {};

      for (const task of stage.agents) {
        const result = await this.executeTask(executionId, stage.id, task);
        outputs[task.agent] = result;
      }

      return outputs;
    } else {
      // parallel
      const promises = stage.agents.map((task: any) =>
        this.executeTask(executionId, stage.id, task)
      );

      const results = await Promise.all(promises);

      const outputs: Record<string, unknown> = {};
      stage.agents.forEach((task: any, index: number) => {
        outputs[task.agent] = results[index];
      });

      return outputs;
    }
  }

  /**
   * Execute a single agent task
   */
  private async executeTask(
    executionId: string,
    stageId: string,
    task: any // AgentTask type
  ): Promise<Record<string, unknown>> {
    const execution = this.registry.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const span: FlowSpan = {
      id: spanId,
      stage_id: stageId,
      agent: task.agent,
      start_time: new Date().toISOString(),
      status: "running",
    };

    this.registry.recordSpan(executionId, span);

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
      span.end_time = new Date().toISOString();
      span.duration_ms = Date.now() - new Date(span.start_time).getTime();

      return result;
    } catch (error) {
      span.status = "failed";
      span.error = (error as Error).message;
      span.end_time = new Date().toISOString();
      span.duration_ms = Date.now() - new Date(span.start_time).getTime();

      throw error;
    }
  }

  /**
   * Interpolate template variables in input (e.g., {{input.foo}}, {{stages[0].output}})
   */
  private interpolateInput(
    input: Record<string, unknown>,
    execution: FlowExecution
  ): Record<string, unknown> {
    // TODO: Implement template interpolation
    // For now, return input as-is
    return input;
  }

  /**
   * Evaluate conditional expressions
   */
  private evaluateCondition(
    condition: string,
    stageOutputs: Record<string, Record<string, unknown>>
  ): boolean {
    // TODO: Implement proper condition evaluation
    // For now, return true (always execute)
    return true;
  }

  /**
   * Create a promise that resolves after delay
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }
}

export default FlowOrchestrator;
