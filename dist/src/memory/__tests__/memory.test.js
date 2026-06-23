"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const MemoryStore_1 = require("../MemoryStore");
const MemoryHarvester_1 = require("../MemoryHarvester");
const MemorySynthesizer_1 = require("../MemorySynthesizer");
const TEST_STORE_PATH = path.join(__dirname, 'test_memory_store.json');
(0, globals_1.describe)('MemoryStore', () => {
    let store;
    (0, globals_1.beforeEach)(async () => {
        (0, MemoryStore_1.resetMemoryStore)();
        // Clean up test file
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // File doesn't exist yet
        }
        store = new MemoryStore_1.MemoryStore(TEST_STORE_PATH);
        await store.load();
    });
    (0, globals_1.afterEach)(async () => {
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // Already deleted
        }
    });
    (0, globals_1.describe)('append', () => {
        (0, globals_1.it)('should append a valid ARPS_DELTA event', async () => {
            const event = await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'arps_synthesizer',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_abc123',
                payload: {
                    change_type: 'phase_completion',
                    phase_id: '23.1',
                    old_value: 'PENDING',
                    new_value: 'COMPLETE',
                    git_commit: 'abc123',
                    confidence: 1.0,
                    affected_subsystems: ['Roadmap'],
                },
                retention_days: 90,
            });
            (0, globals_1.expect)(event.id).toBeDefined();
            (0, globals_1.expect)(event.timestamp).toBeDefined();
            (0, globals_1.expect)(event.checksum).toBeDefined();
            (0, globals_1.expect)(event.event_type).toBe('ARPS_DELTA');
        });
        (0, globals_1.it)('should reject event with invalid schema', async () => {
            (0, globals_1.expect)(store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_abc123',
                payload: {
                    // Missing required 'change_type'
                    old_value: 'test',
                    new_value: 'test',
                    git_commit: 'abc',
                    confidence: 0.5,
                    affected_subsystems: [],
                },
                retention_days: 90,
            })).rejects.toThrow('Schema validation failed');
        });
        (0, globals_1.it)('should reject event with invalid session_id format', async () => {
            (0, globals_1.expect)(store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'invalid_session', // Wrong format
                correlation_id: 'corr_abc123',
                payload: {
                    change_type: 'phase_completion',
                    old_value: 'test',
                    new_value: 'test',
                    git_commit: 'abc',
                    confidence: 0.5,
                    affected_subsystems: [],
                },
                retention_days: 90,
            })).rejects.toThrow('Field validation failed');
        });
        (0, globals_1.it)('should reject event with invalid correlation_id format', async () => {
            (0, globals_1.expect)(store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'invalid', // Wrong format
                payload: {
                    change_type: 'phase_completion',
                    old_value: 'test',
                    new_value: 'test',
                    git_commit: 'abc',
                    confidence: 0.5,
                    affected_subsystems: [],
                },
                retention_days: 90,
            })).rejects.toThrow('Field validation failed');
        });
        (0, globals_1.it)('should compute and include checksum', async () => {
            const event = await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_abc123',
                payload: {
                    change_type: 'phase_completion',
                    old_value: 'OLD',
                    new_value: 'NEW',
                    git_commit: 'abc',
                    confidence: 0.5,
                    affected_subsystems: [],
                },
                retention_days: 90,
            });
            (0, globals_1.expect)(event.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
        });
        (0, globals_1.it)('should persist to disk after append', async () => {
            await store.append({
                event_type: 'PIPELINE_RUN',
                source_agent: 'pipeline',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_test',
                payload: {
                    pipeline_name: 'ingestion',
                    pipeline_id: 'run_001',
                    status: 'success',
                    start_time: '2026-06-07T00:00:00Z',
                    end_time: '2026-06-07T01:00:00Z',
                    duration_ms: 3600000,
                    items_processed: 100,
                    items_successful: 100,
                    items_failed: 0,
                    metrics: {
                        throughput_items_per_second: 0.028,
                        error_rate_percent: 0,
                        resource_usage_mb: 256,
                    },
                },
                retention_days: 90,
            });
            // Verify file was written
            const stat = await fs.stat(TEST_STORE_PATH);
            (0, globals_1.expect)(stat.size).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should persist all 6 event types', async () => {
            const eventTypes = [
                'ARPS_DELTA',
                'PIPELINE_RUN',
                'AGENT_TELEMETRY',
                'GOVERNANCE_SIGNAL',
                'APR_PLAN',
                'CRO_RUN',
            ];
            for (const eventType of eventTypes) {
                const event = await store.append({
                    event_type: eventType,
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: 'corr_test',
                    payload: getPayloadForType(eventType),
                    retention_days: 90,
                });
                (0, globals_1.expect)(event.event_type).toBe(eventType);
            }
            const all = await store.getAll();
            (0, globals_1.expect)(all.length).toBe(6);
        });
    });
    (0, globals_1.describe)('query', () => {
        (0, globals_1.beforeEach)(async () => {
            // Create test data
            await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'arps',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_1',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            await store.append({
                event_type: 'PIPELINE_RUN',
                source_agent: 'pipeline',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_2',
                payload: getPayloadForType('PIPELINE_RUN'),
                retention_days: 90,
            });
            await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'arps',
                session_id: 'session_20260607_002',
                correlation_id: 'corr_3',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
        });
        (0, globals_1.it)('should filter by event_type', async () => {
            const results = await store.query({ event_type: 'ARPS_DELTA' });
            (0, globals_1.expect)(results.length).toBe(2);
            (0, globals_1.expect)(results.every(e => e.event_type === 'ARPS_DELTA')).toBe(true);
        });
        (0, globals_1.it)('should filter by source_agent', async () => {
            const results = await store.query({ source_agent: 'arps' });
            (0, globals_1.expect)(results.length).toBe(2);
            (0, globals_1.expect)(results.every(e => e.source_agent === 'arps')).toBe(true);
        });
        (0, globals_1.it)('should filter by session_id', async () => {
            const results = await store.query({ session_id: 'session_20260607_001' });
            (0, globals_1.expect)(results.length).toBe(2);
        });
        (0, globals_1.it)('should filter by correlation_id', async () => {
            const results = await store.query({ correlation_id: 'corr_1' });
            (0, globals_1.expect)(results.length).toBe(1);
            (0, globals_1.expect)(results[0].correlation_id).toBe('corr_1');
        });
        (0, globals_1.it)('should apply limit', async () => {
            const results = await store.query({ limit: 2 });
            (0, globals_1.expect)(results.length).toBe(2);
        });
        (0, globals_1.it)('should apply offset', async () => {
            const results = await store.query({ offset: 2, limit: 10 });
            (0, globals_1.expect)(results.length).toBe(1);
        });
        (0, globals_1.it)('should filter by timestamp range', async () => {
            const now = new Date();
            const future = new Date(now.getTime() + 10000).toISOString();
            const results = await store.query({ before_timestamp: future });
            (0, globals_1.expect)(results.length).toBe(3);
        });
    });
    (0, globals_1.describe)('persistence', () => {
        (0, globals_1.it)('should load events from disk on startup', async () => {
            const event1 = await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_test',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            // Create new store instance and load
            const store2 = new MemoryStore_1.MemoryStore(TEST_STORE_PATH);
            await store2.load();
            const all = await store2.getAll();
            (0, globals_1.expect)(all.length).toBe(1);
            (0, globals_1.expect)(all[0].id).toBe(event1.id);
        });
        (0, globals_1.it)('should detect and quarantine corrupted events', async () => {
            const event = await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_test',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            // Read file, corrupt checksum
            const data = await fs.readFile(TEST_STORE_PATH, 'utf-8');
            const events = JSON.parse(data);
            events[0].checksum = 'sha256:corrupted';
            await fs.writeFile(TEST_STORE_PATH, JSON.stringify(events));
            // Reload - should quarantine corrupted event
            const store2 = new MemoryStore_1.MemoryStore(TEST_STORE_PATH);
            await store2.load();
            const all = await store2.getAll();
            (0, globals_1.expect)(all.length).toBe(0); // Corrupted event removed
        });
    });
    (0, globals_1.describe)('stats', () => {
        (0, globals_1.it)('should return empty stats for new store', async () => {
            const stats = await store.getStats();
            (0, globals_1.expect)(stats.total_events).toBe(0);
            (0, globals_1.expect)(stats.corrupted_events).toBe(0);
            (0, globals_1.expect)(stats.event_types).toEqual({});
        });
        (0, globals_1.it)('should return event counts by type', async () => {
            await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_1',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            await store.append({
                event_type: 'PIPELINE_RUN',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_2',
                payload: getPayloadForType('PIPELINE_RUN'),
                retention_days: 90,
            });
            const stats = await store.getStats();
            (0, globals_1.expect)(stats.total_events).toBe(2);
            (0, globals_1.expect)(stats.event_types['ARPS_DELTA']).toBe(1);
            (0, globals_1.expect)(stats.event_types['PIPELINE_RUN']).toBe(1);
        });
    });
});
(0, globals_1.describe)('MemoryHarvester', () => {
    let store;
    let harvester;
    (0, globals_1.beforeEach)(async () => {
        (0, MemoryStore_1.resetMemoryStore)();
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // File doesn't exist yet
        }
        store = new MemoryStore_1.MemoryStore(TEST_STORE_PATH);
        await store.load();
        harvester = new MemoryHarvester_1.MemoryHarvester(store);
    });
    (0, globals_1.afterEach)(async () => {
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // Already deleted
        }
    });
    (0, globals_1.describe)('ingestEvent', () => {
        (0, globals_1.it)('should ingest valid event', async () => {
            const result = await harvester.ingestEvent({
                event_type: 'ARPS_DELTA',
                source_agent: 'test_agent',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            (0, globals_1.expect)(result.status).toBe('success');
            (0, globals_1.expect)(result.event_id).toBeDefined();
            (0, globals_1.expect)(result.timestamp).toBeDefined();
        });
        (0, globals_1.it)('should auto-generate session and correlation IDs', async () => {
            const result = await harvester.ingestEvent({
                event_type: 'ARPS_DELTA',
                source_agent: 'test_agent',
                payload: getPayloadForType('ARPS_DELTA'),
            });
            (0, globals_1.expect)(result.status).toBe('success');
            const all = await store.getAll();
            (0, globals_1.expect)(all[0].session_id).toMatch(/^session_\d{8}_\d{3,}$/);
            (0, globals_1.expect)(all[0].correlation_id).toMatch(/^corr_[a-z0-9]{6,}$/);
        });
        (0, globals_1.it)('should reject invalid event', async () => {
            const result = await harvester.ingestEvent({
                event_type: 'ARPS_DELTA',
                source_agent: 'test_agent',
                payload: {
                    // Missing required fields
                    old_value: 'test',
                },
            });
            (0, globals_1.expect)(result.status).toBe('error');
            (0, globals_1.expect)(result.error).toBeDefined();
        });
        (0, globals_1.it)('should apply default retention for event type', async () => {
            const result = await harvester.ingestEvent({
                event_type: 'GOVERNANCE_SIGNAL',
                source_agent: 'test',
                payload: getPayloadForType('GOVERNANCE_SIGNAL'),
                // No retention_days specified
            });
            (0, globals_1.expect)(result.status).toBe('success');
            const all = await store.getAll();
            (0, globals_1.expect)(all[0].retention_days).toBe(365); // GOVERNANCE_SIGNAL default
        });
        (0, globals_1.it)('should update metrics on success', async () => {
            await harvester.ingestEvent({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                payload: getPayloadForType('ARPS_DELTA'),
            });
            const metrics = harvester.getMetrics();
            (0, globals_1.expect)(metrics.events_ingested).toBe(1);
            (0, globals_1.expect)(metrics.events_by_type['ARPS_DELTA']).toBe(1);
            (0, globals_1.expect)(metrics.events_rejected).toBe(0);
        });
        (0, globals_1.it)('should update metrics on error', async () => {
            await harvester.ingestEvent({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                payload: {}, // Invalid
            });
            const metrics = harvester.getMetrics();
            (0, globals_1.expect)(metrics.events_rejected).toBe(1);
            (0, globals_1.expect)(metrics.last_error).toBeDefined();
        });
    });
    (0, globals_1.describe)('ingestBatch', () => {
        (0, globals_1.it)('should ingest multiple events', async () => {
            const results = await harvester.ingestBatch([
                {
                    event_type: 'ARPS_DELTA',
                    source_agent: 'test',
                    payload: getPayloadForType('ARPS_DELTA'),
                },
                {
                    event_type: 'PIPELINE_RUN',
                    source_agent: 'test',
                    payload: getPayloadForType('PIPELINE_RUN'),
                },
            ]);
            (0, globals_1.expect)(results.length).toBe(2);
            (0, globals_1.expect)(results.every(r => r.status === 'success')).toBe(true);
        });
        (0, globals_1.it)('should handle mixed valid/invalid batch', async () => {
            const results = await harvester.ingestBatch([
                {
                    event_type: 'ARPS_DELTA',
                    source_agent: 'test',
                    payload: getPayloadForType('ARPS_DELTA'),
                },
                {
                    event_type: 'ARPS_DELTA',
                    source_agent: 'test',
                    payload: {}, // Invalid
                },
            ]);
            (0, globals_1.expect)(results.length).toBe(2);
            (0, globals_1.expect)(results[0].status).toBe('success');
            (0, globals_1.expect)(results[1].status).toBe('error');
        });
    });
    (0, globals_1.describe)('session management', () => {
        (0, globals_1.it)('should reset session', () => {
            const oldSession = harvester.getMetrics().current_session;
            harvester.resetSession();
            const newSession = harvester.getMetrics().current_session;
            (0, globals_1.expect)(newSession).not.toBe(oldSession);
            (0, globals_1.expect)(newSession).toMatch(/^session_\d{8}_\d{3,}$/);
        });
    });
});
(0, globals_1.describe)('MemorySynthesizer', () => {
    let store;
    let synthesizer;
    (0, globals_1.beforeEach)(async () => {
        (0, MemoryStore_1.resetMemoryStore)();
        (0, MemorySynthesizer_1.resetMemorySynthesizer)();
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // File doesn't exist yet
        }
        store = new MemoryStore_1.MemoryStore(TEST_STORE_PATH);
        await store.load();
        synthesizer = new MemorySynthesizer_1.MemorySynthesizer(store);
    });
    (0, globals_1.afterEach)(async () => {
        try {
            await fs.unlink(TEST_STORE_PATH);
        }
        catch (e) {
            // Already deleted
        }
    });
    (0, globals_1.describe)('generateWeeklySummary', () => {
        (0, globals_1.it)('should generate weekly summary with no events', async () => {
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.period).toBe('weekly');
            (0, globals_1.expect)(summary.event_count).toBe(0);
            (0, globals_1.expect)(summary.trend).toBe('stable');
        });
        (0, globals_1.it)('should count events by type', async () => {
            await store.append({
                event_type: 'ARPS_DELTA',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_1',
                payload: getPayloadForType('ARPS_DELTA'),
                retention_days: 90,
            });
            await store.append({
                event_type: 'PIPELINE_RUN',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_2',
                payload: getPayloadForType('PIPELINE_RUN'),
                retention_days: 90,
            });
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.event_count).toBe(2);
            (0, globals_1.expect)(summary.event_counts_by_type['ARPS_DELTA']).toBe(1);
            (0, globals_1.expect)(summary.event_counts_by_type['PIPELINE_RUN']).toBe(1);
        });
        (0, globals_1.it)('should detect improving trend with successful pipelines', async () => {
            for (let i = 0; i < 3; i++) {
                await store.append({
                    event_type: 'PIPELINE_RUN',
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: `corr_${i}`,
                    payload: {
                        ...getPayloadForType('PIPELINE_RUN'),
                        status: 'success',
                        items_failed: 0,
                    },
                    retention_days: 90,
                });
            }
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.trend).toBe('improving');
        });
        (0, globals_1.it)('should generate observations', async () => {
            await store.append({
                event_type: 'PIPELINE_RUN',
                source_agent: 'test',
                session_id: 'session_20260607_001',
                correlation_id: 'corr_1',
                payload: getPayloadForType('PIPELINE_RUN'),
                retention_days: 90,
            });
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.observations.length).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.observations[0]).toMatch(/pipeline/i);
        });
        (0, globals_1.it)('should generate recommendations for low activity', async () => {
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.recommendations.length).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.recommendations[0]).toMatch(/low/i);
        });
    });
    (0, globals_1.describe)('generateMonthlySummary', () => {
        (0, globals_1.it)('should generate monthly summary', async () => {
            for (let i = 0; i < 5; i++) {
                await store.append({
                    event_type: 'PIPELINE_RUN',
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: `corr_${i}`,
                    payload: getPayloadForType('PIPELINE_RUN'),
                    retention_days: 90,
                });
            }
            const summary = await synthesizer.generateMonthlySummary();
            (0, globals_1.expect)(summary.period).toBe('monthly');
            (0, globals_1.expect)(summary.event_count).toBe(5);
            (0, globals_1.expect)(summary.total_weeks).toBe(4);
        });
        (0, globals_1.it)('should detect risk signals', async () => {
            for (let i = 0; i < 5; i++) {
                await store.append({
                    event_type: 'PIPELINE_RUN',
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: `corr_${i}`,
                    payload: {
                        ...getPayloadForType('PIPELINE_RUN'),
                        status: 'failed',
                        items_failed: 10,
                    },
                    retention_days: 90,
                });
            }
            const summary = await synthesizer.generateMonthlySummary();
            (0, globals_1.expect)(summary.risk_signals.length).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.risk_signals[0]).toMatch(/failure/i);
        });
        (0, globals_1.it)('should detect capability growth', async () => {
            for (let i = 0; i < 6; i++) {
                await store.append({
                    event_type: 'APR_PLAN',
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: `corr_${i}`,
                    payload: getPayloadForType('APR_PLAN'),
                    retention_days: 365,
                });
            }
            const summary = await synthesizer.generateMonthlySummary();
            (0, globals_1.expect)(summary.capability_growth.length).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.capability_growth[0]).toMatch(/planning/i);
        });
    });
    (0, globals_1.describe)('summaries retrieval', () => {
        (0, globals_1.it)('should retrieve all summaries', async () => {
            await synthesizer.generateWeeklySummary();
            await synthesizer.generateMonthlySummary();
            const summaries = await synthesizer.getAllSummaries();
            (0, globals_1.expect)(summaries.length).toBe(2);
        });
        (0, globals_1.it)('should retrieve recent weekly summaries', async () => {
            await synthesizer.generateWeeklySummary();
            const recent = await synthesizer.getRecentWeeklySummaries(1);
            (0, globals_1.expect)(recent.length).toBe(1);
            (0, globals_1.expect)(recent[0].period).toBe('weekly');
        });
        (0, globals_1.it)('should retrieve recent monthly summaries', async () => {
            await synthesizer.generateMonthlySummary();
            const recent = await synthesizer.getRecentMonthlySummaries(1);
            (0, globals_1.expect)(recent.length).toBe(1);
            (0, globals_1.expect)(recent[0].period).toBe('monthly');
        });
    });
    (0, globals_1.describe)('trend analysis', () => {
        (0, globals_1.it)('should calculate trend lines', async () => {
            for (let i = 0; i < 3; i++) {
                await store.append({
                    event_type: 'PIPELINE_RUN',
                    source_agent: 'test',
                    session_id: 'session_20260607_001',
                    correlation_id: `corr_${i}`,
                    payload: {
                        ...getPayloadForType('PIPELINE_RUN'),
                        status: 'success',
                    },
                    retention_days: 90,
                });
            }
            const summary = await synthesizer.generateWeeklySummary();
            (0, globals_1.expect)(summary.trend_lines.length).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.trend_lines[0].metric).toBeDefined();
            (0, globals_1.expect)(summary.trend_lines[0].direction).toMatch(/improving|degrading|stable/);
        });
    });
});
// Helper function to generate valid payloads for each event type
function getPayloadForType(eventType) {
    const payloads = {
        ARPS_DELTA: {
            change_type: 'phase_completion',
            phase_id: '23.1',
            old_value: 'PENDING',
            new_value: 'COMPLETE',
            git_commit: 'abc123',
            confidence: 1.0,
            affected_subsystems: ['Roadmap'],
        },
        PIPELINE_RUN: {
            pipeline_name: 'ingestion',
            pipeline_id: 'run_001',
            status: 'success',
            start_time: '2026-06-07T00:00:00Z',
            end_time: '2026-06-07T01:00:00Z',
            duration_ms: 3600000,
            items_processed: 100,
            items_successful: 100,
            items_failed: 0,
            metrics: {
                throughput_items_per_second: 0.028,
                error_rate_percent: 0,
                resource_usage_mb: 256,
            },
        },
        AGENT_TELEMETRY: {
            agent_name: 'test_agent',
            agent_class: 'ingestion',
            status: 'healthy',
            uptime_seconds: 86400,
            task_count: 1000,
            task_success_rate: 0.99,
            performance: {
                avg_task_duration_ms: 100,
                p95_task_duration_ms: 500,
                cpu_usage_percent: 10,
                memory_usage_mb: 256,
                error_rate_percent: 1.0,
            },
        },
        GOVERNANCE_SIGNAL: {
            signal_type: 'approval',
            entity_type: 'skill',
            entity_id: 'test_skill',
            decision: 'approved',
            reason: 'Auto-approved',
            approval_count: 3,
            approval_threshold: 2,
            metadata: {
                tier: 1,
            },
        },
        APR_PLAN: {
            plan_id: 'plan_001',
            goal: 'Test goal',
            plan_type: 'feature_development',
            status: 'generated',
            task_count: 3,
            task_graph: [
                { id: 'task_1', name: 'Task 1', depends_on: [], estimated_effort_hours: 2 },
            ],
            critical_path_hours: 2,
            risk_level: 'low',
            risk_factors: [],
            agent_consensus_score: 1.0,
            agents_involved: ['agent_1'],
        },
        CRO_RUN: {
            run_id: 'run_001',
            plan_id: 'plan_001',
            status: 'completed',
            start_time: '2026-06-07T00:00:00Z',
            end_time: '2026-06-07T01:00:00Z',
            duration_ms: 3600000,
            step_count: 1,
            step_results: [
                {
                    step_id: 'step_1',
                    task_id: 'task_1',
                    agent_name: 'agent_1',
                    status: 'success',
                    duration_ms: 1000,
                    output_size_bytes: 4096,
                },
            ],
        },
    };
    return payloads[eventType];
}
//# sourceMappingURL=memory.test.js.map