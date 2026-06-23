"use strict";
/**
 * Phase 23.2 — Memory Harvester Agent
 * Collects events from ARPS, pipeline runs, agent telemetry, governance, APR plans, CRO runs, and social media extractions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryHarvester = void 0;
class MemoryHarvester {
    constructor(config) {
        this.substrate = config.substrate;
        this.sessionId = config.session_id;
    }
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
    generateCorrelationId() {
        return `corr_${Math.random().toString(16).slice(2, 8)}`;
    }
    /**
     * Record a roadmap delta (ARPS changes)
     */
    async harvestARPSDelta(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "ARPS_DELTA",
            source_agent: "arps_synthesizer",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 90,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record a pipeline execution (ingestion, classification, etc.)
     */
    async harvestPipelineRun(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "PIPELINE_RUN",
            source_agent: "pipeline_orchestrator",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 90,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record agent health and performance (from agent monitor)
     */
    async harvestAgentTelemetry(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "AGENT_TELEMETRY",
            source_agent: "agent_monitor",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 90,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record governance decisions (approvals, rejections, escalations)
     */
    async harvestGovernanceSignal(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "GOVERNANCE_SIGNAL",
            source_agent: "approval_handler",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 365,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record autonomous planning decisions (APR)
     */
    async harvestAPRPlan(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "APR_PLAN",
            source_agent: "autonomous_planner",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 365,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record task execution (CRO)
     */
    async harvestCRORun(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "CRO_RUN",
            source_agent: "runtime_orchestrator",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 90,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Record social media platform extraction (new for Phase 23.2)
     */
    async harvestPlatformExtraction(payload) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event_type: "PLATFORM_EXTRACTION",
            source_agent: "social_media_orchestrator",
            session_id: this.sessionId,
            correlation_id: this.generateCorrelationId(),
            payload,
            retention_days: 90,
            version: 1,
        };
        await this.substrate.append(event);
    }
    /**
     * Batch ingest events (for integration with other systems)
     */
    async ingestBatch(events) {
        let count = 0;
        for (const item of events) {
            const event = {
                id: this.generateEventId(),
                timestamp: new Date().toISOString(),
                event_type: item.event_type,
                source_agent: item.source_agent || "unknown_source",
                session_id: this.sessionId,
                correlation_id: this.generateCorrelationId(),
                payload: item.payload,
                retention_days: item.retention_days || 90,
                version: 1,
            };
            try {
                await this.substrate.append(event);
                count++;
            }
            catch (err) {
                console.error(`Failed to ingest event: ${err}`);
            }
        }
        return count;
    }
}
exports.MemoryHarvester = MemoryHarvester;
//# sourceMappingURL=memory-harvester.js.map