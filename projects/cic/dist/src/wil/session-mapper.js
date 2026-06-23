/**
 * Pipeline ↔ Wayland Session Mapper (Phase 46.4)
 *
 * Map CIC pipeline runs to Wayland UI sessions.
 * Emit pipeline step logs, governance decisions, and tool call events as structured events.
 */
import { EventEmitter } from 'events';
export class SessionMapper extends EventEmitter {
    constructor() {
        super(...arguments);
        this.sessions = new Map();
        this.eventBuffer = new Map();
        this.eventBufferSize = 1000;
    }
    createSession(pipelineId) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const correlationId = `corr-${sessionId}`;
        const session = {
            session_id: sessionId,
            pipeline_id: pipelineId,
            created_at: new Date().toISOString(),
            correlation_id: correlationId
        };
        this.sessions.set(sessionId, session);
        this.eventBuffer.set(sessionId, []);
        return session;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    emitStepStart(sessionId, stepName, stepIndex) {
        const session = this.getSession(sessionId);
        if (!session)
            return;
        this.emitEvent({
            type: 'step.start',
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            correlation_id: session.correlation_id,
            data: {
                step_name: stepName,
                step_index: stepIndex
            }
        });
    }
    emitStepEnd(sessionId, stepName, duration_ms, status) {
        const session = this.getSession(sessionId);
        if (!session)
            return;
        this.emitEvent({
            type: 'step.end',
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            correlation_id: session.correlation_id,
            data: {
                step_name: stepName,
                duration_ms,
                status
            }
        });
    }
    emitStepError(sessionId, stepName, error) {
        const session = this.getSession(sessionId);
        if (!session)
            return;
        this.emitEvent({
            type: 'step.error',
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            correlation_id: session.correlation_id,
            data: {
                step_name: stepName,
                error
            }
        });
    }
    emitGovernanceDecision(sessionId, decision) {
        const session = this.getSession(sessionId);
        if (!session)
            return;
        this.emitEvent({
            type: 'governance.decision',
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            correlation_id: session.correlation_id,
            data: {
                rule: decision.rule,
                verdict: decision.verdict,
                reasoning: decision.reasoning,
                metadata: decision.metadata
            }
        });
    }
    emitToolCall(sessionId, toolCall) {
        const session = this.getSession(sessionId);
        if (!session)
            return;
        this.emitEvent({
            type: 'tool.call',
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            correlation_id: session.correlation_id,
            data: {
                tool: toolCall.tool,
                args: toolCall.args,
                duration_ms: toolCall.duration_ms,
                success: toolCall.success,
                error: toolCall.error
            }
        });
    }
    emitEvent(event) {
        const events = this.eventBuffer.get(event.session_id);
        if (events) {
            events.push(event);
            if (events.length > this.eventBufferSize) {
                events.shift();
            }
        }
        this.emit('event', event);
        console.log(JSON.stringify({
            level: 'info',
            timestamp: event.timestamp,
            event_type: event.type,
            session_id: event.session_id,
            correlation_id: event.correlation_id,
            data: event.data
        }));
    }
    getEventHistory(sessionId) {
        return this.eventBuffer.get(sessionId) || [];
    }
    getSessionStats(sessionId) {
        const events = this.getEventHistory(sessionId);
        const session = this.getSession(sessionId);
        if (!session)
            return {};
        const stepStarts = events.filter((e) => e.type === 'step.start').length;
        const stepEnds = events.filter((e) => e.type === 'step.end').length;
        const stepErrors = events.filter((e) => e.type === 'step.error').length;
        const governanceDecisions = events.filter((e) => e.type === 'governance.decision').length;
        const toolCalls = events.filter((e) => e.type === 'tool.call').length;
        const totalDuration = events
            .filter((e) => e.type === 'step.end')
            .reduce((sum, e) => sum + (e.data.duration_ms || 0), 0);
        return {
            session_id: sessionId,
            pipeline_id: session.pipeline_id,
            created_at: session.created_at,
            event_count: events.length,
            step_starts: stepStarts,
            step_ends: stepEnds,
            step_errors: stepErrors,
            governance_decisions: governanceDecisions,
            tool_calls: toolCalls,
            total_duration_ms: totalDuration
        };
    }
    closeSession(sessionId) {
        this.sessions.delete(sessionId);
        this.eventBuffer.delete(sessionId);
    }
}
export default SessionMapper;
//# sourceMappingURL=session-mapper.js.map