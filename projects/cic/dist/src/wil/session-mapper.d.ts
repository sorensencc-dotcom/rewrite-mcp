/**
 * Pipeline ↔ Wayland Session Mapper (Phase 46.4)
 *
 * Map CIC pipeline runs to Wayland UI sessions.
 * Emit pipeline step logs, governance decisions, and tool call events as structured events.
 */
import { EventEmitter } from 'events';
export interface WaylandSession {
    session_id: string;
    pipeline_id: string;
    created_at: string;
    correlation_id: string;
}
export interface PipelineEvent {
    type: 'step.start' | 'step.end' | 'step.error' | 'governance.decision' | 'tool.call' | 'tool.result';
    timestamp: string;
    session_id: string;
    pipeline_id: string;
    correlation_id: string;
    data: Record<string, unknown>;
}
export interface GovernanceDecision {
    rule: string;
    verdict: 'approve' | 'reject' | 'review';
    reasoning: string;
    metadata?: Record<string, unknown>;
}
export interface ToolCall {
    tool: string;
    args: Record<string, unknown>;
    duration_ms: number;
    success: boolean;
    error?: string;
}
export declare class SessionMapper extends EventEmitter {
    private sessions;
    private eventBuffer;
    private eventBufferSize;
    createSession(pipelineId: string): WaylandSession;
    getSession(sessionId: string): WaylandSession | undefined;
    emitStepStart(sessionId: string, stepName: string, stepIndex: number): void;
    emitStepEnd(sessionId: string, stepName: string, duration_ms: number, status: 'success' | 'failure'): void;
    emitStepError(sessionId: string, stepName: string, error: string): void;
    emitGovernanceDecision(sessionId: string, decision: GovernanceDecision): void;
    emitToolCall(sessionId: string, toolCall: ToolCall): void;
    private emitEvent;
    getEventHistory(sessionId: string): PipelineEvent[];
    getSessionStats(sessionId: string): Record<string, unknown>;
    closeSession(sessionId: string): void;
}
export default SessionMapper;
