"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryHarvester = void 0;
exports.createMemoryIngestRouter = createMemoryIngestRouter;
exports.getMemoryHarvester = getMemoryHarvester;
const MemoryStore_1 = require("./MemoryStore");
const express_1 = require("express");
class MemoryHarvester {
    constructor(store) {
        this.metrics = {
            events_ingested: 0,
            events_rejected: 0,
            events_by_type: {},
            last_error: null,
        };
        this.currentSession = this.generateSessionId();
        this.requestCounter = 0;
        this.store = store;
    }
    /**
     * Ingest a single event
     */
    async ingestEvent(request) {
        try {
            // Auto-generate session/correlation if not provided
            const sessionId = request.session_id || this.currentSession;
            const correlationId = request.correlation_id || this.generateCorrelationId();
            // Default retention
            const retentionDays = request.retention_days || this.getDefaultRetention(request.event_type);
            // Create event
            const event = await this.store.append({
                event_type: request.event_type,
                source_agent: request.source_agent,
                session_id: sessionId,
                correlation_id: correlationId,
                payload: request.payload,
                retention_days: retentionDays,
            });
            // Update metrics
            this.metrics.events_ingested++;
            this.metrics.events_by_type[request.event_type] =
                (this.metrics.events_by_type[request.event_type] || 0) + 1;
            this.metrics.last_error = null;
            return {
                status: 'success',
                event_id: event.id,
                timestamp: event.timestamp,
            };
        }
        catch (error) {
            this.metrics.events_rejected++;
            this.metrics.last_error = error.message;
            // Log validation errors
            const validationErrors = error.message.includes('Schema validation')
                ? [error.message]
                : undefined;
            return {
                status: 'error',
                error: error.message,
                validation_errors: validationErrors,
            };
        }
    }
    /**
     * Ingest batch of events
     */
    async ingestBatch(requests) {
        return Promise.all(requests.map(req => this.ingestEvent(req)));
    }
    /**
     * Get harvester metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            current_session: this.currentSession,
            request_counter: this.requestCounter,
        };
    }
    /**
     * Reset session (e.g., on new operator session)
     */
    resetSession() {
        this.currentSession = this.generateSessionId();
        this.requestCounter = 0;
    }
    // Private methods
    getDefaultRetention(eventType) {
        const defaults = {
            ARPS_DELTA: 90,
            PIPELINE_RUN: 90,
            AGENT_TELEMETRY: 90,
            GOVERNANCE_SIGNAL: 365,
            APR_PLAN: 365,
            CRO_RUN: 90,
        };
        return defaults[eventType] || 90;
    }
    generateSessionId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return `session_${year}${month}${day}_${sequence}`;
    }
    generateCorrelationId() {
        this.requestCounter++;
        const random = Math.random().toString(36).substring(2, 8);
        return `corr_${random}`;
    }
}
exports.MemoryHarvester = MemoryHarvester;
// Express router for ingest API
function createMemoryIngestRouter(harvester) {
    const router = (0, express_1.Router)();
    /**
     * POST /memory/ingest
     * Ingest a single event
     */
    router.post('/ingest', async (req, res) => {
        const result = await harvester.ingestEvent(req.body);
        if (result.status === 'success') {
            res.status(201).json(result);
        }
        else {
            res.status(400).json(result);
        }
    });
    /**
     * POST /memory/ingest/batch
     * Ingest multiple events
     */
    router.post('/ingest/batch', async (req, res) => {
        const results = await harvester.ingestBatch(req.body);
        const successes = results.filter(r => r.status === 'success').length;
        const failures = results.filter(r => r.status === 'error').length;
        res.status(207).json({
            total: results.length,
            successes,
            failures,
            results,
        });
    });
    /**
     * GET /memory/metrics
     * Get harvester metrics
     */
    router.get('/metrics', (req, res) => {
        res.json(harvester.getMetrics());
    });
    /**
     * POST /memory/session/reset
     * Reset session (new operator session)
     */
    router.post('/session/reset', (req, res) => {
        harvester.resetSession();
        res.json({ status: 'ok', new_session: harvester.getMetrics().current_session });
    });
    return router;
}
// Singleton instance
let harvesterInstance = null;
async function getMemoryHarvester() {
    if (!harvesterInstance) {
        const store = await (0, MemoryStore_1.getMemoryStore)();
        harvesterInstance = new MemoryHarvester(store);
    }
    return harvesterInstance;
}
//# sourceMappingURL=MemoryHarvester.js.map