import { MemoryStore } from "../store/memory-store";
import {
  IMemoryHarvester,
  PipelineRunData,
  AgentTelemetryData,
  GovernanceSignalData,
  APRPlanData,
  CRORunData,
  ARPSDeltaData,
  HarvesterOptions,
} from "./memory-harvester.types";
import { CreateMemoryEventInput, EventType } from "../store/memory-store.types";
import { v4 as uuidv4 } from "uuid";

export class MemoryHarvester implements IMemoryHarvester {
  private store: MemoryStore;
  private sourceAgent: string;
  private sessionId: string;
  private correlationId: string;
  private autoFlushThreshold: number;
  private autoFlushIntervalMs: number;
  private autoFlushTimer: NodeJS.Timeout | null = null;

  constructor(options: HarvesterOptions = {}) {
    this.store = new MemoryStore(options.storePath);
    this.sourceAgent = options.sourceAgent || "harvester";
    this.sessionId = options.sessionId || this.generateSessionId();
    this.correlationId = options.correlationId || uuidv4();
    this.autoFlushThreshold = options.autoFlushThreshold || 50;
    this.autoFlushIntervalMs = options.autoFlushIntervalMs || 30000;
    this.startAutoFlush();
  }

  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `session_${dateStr}_${seq}`;
  }

  private startAutoFlush(): void {
    if (this.autoFlushIntervalMs > 0) {
      this.autoFlushTimer = setInterval(() => {
        this.flush().catch((err) =>
          console.error("Auto-flush failed:", err)
        );
      }, this.autoFlushIntervalMs);
    }
  }

  async registerPipelineEvent(
    name: string,
    run: PipelineRunData
  ): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "PIPELINE_RUN",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: run,
      retention_days: 90,
    };
    await this.store.append(event);
  }

  async registerTelemetryEvent(agent: AgentTelemetryData): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "AGENT_TELEMETRY",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: agent,
      retention_days: 90,
    };
    await this.store.append(event);
  }

  async registerGovernanceSignal(
    signal: GovernanceSignalData
  ): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "GOVERNANCE_SIGNAL",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: signal,
      retention_days: 365,
    };
    await this.store.append(event);
  }

  async registerPlanEvent(plan: APRPlanData): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "APR_PLAN",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: plan,
      retention_days: 365,
    };
    await this.store.append(event);
  }

  async registerExecutionEvent(run: CRORunData): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "CRO_RUN",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: run,
      retention_days: 90,
    };
    await this.store.append(event);
  }

  async registerDeltaEvent(delta: ARPSDeltaData): Promise<void> {
    const event: CreateMemoryEventInput = {
      timestamp: new Date().toISOString(),
      event_type: "ARPS_DELTA",
      source_agent: this.sourceAgent,
      session_id: this.sessionId,
      correlation_id: this.correlationId,
      payload: delta,
      retention_days: 90,
    };
    await this.store.append(event);
  }

  async flush(): Promise<void> {
    await this.store.flush_sync();
  }

  destroy(): void {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
    }
  }
}

export { IMemoryHarvester, HarvesterOptions };
