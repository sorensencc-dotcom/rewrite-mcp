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
export declare class MemoryStore {
    private events;
    writeAPRPlan(plan: APRPlan, waylandSessionId?: string): void;
    writeCRORun(run: CRORun, waylandSessionId?: string): void;
    writeAdapterCall(adapterType: string, action: string, status: 'success' | 'failed', durationMs: number, metadata?: Record<string, any>): void;
    writeGovernanceSignal(signalId: string, adapterType: string, action: string, severity: 'low' | 'medium' | 'high' | 'critical', blocked: boolean, reason: string, waylandSessionId?: string): void;
    writeSessionMapping(sessionId: string, planId: string, runId: string): void;
    writeAgentTelemetry(agentName: string, status: 'running' | 'idle' | 'failed', metadata?: Record<string, any>): void;
    getEvents(): MLAEvent[];
    getEventsByType(type: MLAEvent['type']): MLAEvent[];
    getEventsBySessionId(sessionId: string): MLAEvent[];
    clear(): void;
}
