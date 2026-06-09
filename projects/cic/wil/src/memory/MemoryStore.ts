import { APRPlan } from "../apr/APR";
import { CRORun } from "../cro/CRO";

export interface MLAEvent {
  eventId: string;
  timestamp: number;
  type: 'APR_PLAN' | 'CRO_RUN' | 'ADAPTER_CALL' | 'GOVERNANCE_SIGNAL' | 'AGENT_TELEMETRY';
  sessionId?: string;
  waylandSessionId?: string;
  planId?: string;
  runId?: string;
  stepId?: string;
  adapterType?: string;
  status: 'pending' | 'success' | 'failed';
  metadata: Record<string, any>;
}

export class MemoryStore {
  private events: MLAEvent[] = [];

  writeAPRPlan(plan: APRPlan, waylandSessionId?: string): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'APR_PLAN',
      planId: plan.planId,
      waylandSessionId,
      status: 'success',
      metadata: {
        goal: plan.goal,
        taskCount: plan.taskCount,
        tasks: plan.tasks.map((t) => ({ id: t.id, name: t.name, dependsOn: t.dependsOn })),
      },
    };
    this.events.push(event);
    console.log(`[MLA] APR_PLAN event: ${event.eventId} (planId: ${plan.planId})`);
  }

  writeCRORun(run: CRORun, waylandSessionId?: string): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'CRO_RUN',
      runId: run.runId,
      planId: run.planId,
      waylandSessionId,
      status: run.status === 'completed' ? 'success' : run.status === 'failed' ? 'failed' : 'pending',
      metadata: {
        planId: run.planId,
        stepCount: run.stepCount,
        steps: run.stepResults.map((s) => ({
          stepId: s.stepId,
          taskId: s.taskId,
          status: s.status,
          durationMs: s.durationMs,
          error: s.error,
        })),
      },
    };
    this.events.push(event);
    console.log(`[MLA] CRO_RUN event: ${event.eventId} (runId: ${run.runId})`);
  }

  writeAdapterCall(
    adapterType: string,
    action: string,
    status: 'success' | 'failed',
    durationMs: number,
    metadata?: Record<string, any>
  ): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'ADAPTER_CALL',
      adapterType: adapterType as any,
      status,
      metadata: {
        action,
        durationMs,
        ...metadata,
      },
    };
    this.events.push(event);
  }

  writeGovernanceSignal(
    signalId: string,
    adapterType: string,
    action: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    blocked: boolean,
    reason: string,
    waylandSessionId?: string
  ): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'GOVERNANCE_SIGNAL',
      waylandSessionId,
      status: blocked ? 'failed' : 'success',
      metadata: {
        signalId,
        adapterType,
        action,
        severity,
        blocked,
        reason,
      },
    };
    this.events.push(event);
    if (blocked) {
      console.log(`[MLA] GOVERNANCE_SIGNAL VIOLATION: ${signalId} (${adapterType}:${action})`);
    }
  }

  writeSessionMapping(
    sessionId: string,
    planId: string,
    runId: string
  ): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'AGENT_TELEMETRY',
      waylandSessionId: sessionId,
      planId,
      runId,
      status: 'success',
      metadata: {
        correlationType: 'wayland_session_mapping',
        sessionId,
        planId,
        runId,
      },
    };
    this.events.push(event);
    console.log(`[MLA] SESSION MAPPING: ${sessionId} → ${planId} → ${runId}`);
  }

  writeAgentTelemetry(
    agentName: string,
    status: 'running' | 'idle' | 'failed',
    metadata?: Record<string, any>
  ): void {
    const event: MLAEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'AGENT_TELEMETRY',
      status: status === 'failed' ? 'failed' : 'success',
      metadata: {
        agentName,
        status,
        ...metadata,
      },
    };
    this.events.push(event);
  }

  getEvents(): MLAEvent[] {
    return [...this.events];
  }

  getEventsByType(type: MLAEvent['type']): MLAEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getEventsBySessionId(sessionId: string): MLAEvent[] {
    return this.events.filter((e) => e.waylandSessionId === sessionId);
  }

  clear(): void {
    this.events = [];
  }
}
