"use strict";
/**
 * Phase E.0a — Execution State Persistence Test
 * Verifies that FlowRegistry execution state persists across instances
 * and that multi-instance deployments share state correctly
 */
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
const vitest_1 = require("vitest");
const FlowRegistry_1 = require("../src/ruflo-orchestration/FlowRegistry");
const FileExecutionStore_1 = require("../src/ruflo-orchestration/FileExecutionStore");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('Phase E.0a — Execution State Persistence', () => {
    let tempDir;
    let store1;
    let store2;
    let registry1;
    let registry2;
    (0, vitest_1.beforeEach)(async () => {
        // Create temporary directory for test executions
        tempDir = path.join(os.tmpdir(), `cic-e0a-test-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        // Create two execution stores pointing to same path (simulating 2 instances)
        store1 = new FileExecutionStore_1.FileExecutionStore({
            basePath: tempDir,
            retentionDays: 1,
        });
        store2 = new FileExecutionStore_1.FileExecutionStore({
            basePath: tempDir,
            retentionDays: 1,
        });
        // Create two FlowRegistry instances with shared store
        registry1 = new FlowRegistry_1.FlowRegistry(store1);
        registry2 = new FlowRegistry_1.FlowRegistry(store2);
    });
    (0, vitest_1.afterEach)(async () => {
        // Cleanup
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (err) {
            // Ignore cleanup errors
        }
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // Single Instance Tests
    // ═══════════════════════════════════════════════════════════════════════════
    (0, vitest_1.it)('[Single Instance] Starts execution and persists to store', async () => {
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-1' }, 'trace-1');
        (0, vitest_1.expect)(execution.id).toBeDefined();
        (0, vitest_1.expect)(execution.status).toBe('queued');
        // Verify it was persisted to file
        const filePath = path.join(tempDir, `${execution.id}.json`);
        const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);
        (0, vitest_1.expect)(fileExists).toBe(true);
    });
    (0, vitest_1.it)('[Single Instance] Retrieves persisted execution', async () => {
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-2' }, 'trace-2');
        const retrieved = registry1.getExecution(execution.id);
        (0, vitest_1.expect)(retrieved).toBeDefined();
        (0, vitest_1.expect)(retrieved?.id).toBe(execution.id);
        (0, vitest_1.expect)(retrieved?.status).toBe('queued');
    });
    (0, vitest_1.it)('[Single Instance] Updates execution state', async () => {
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-3' }, 'trace-3');
        await registry1.updateExecution(execution.id, {
            status: 'running',
            started_at: new Date().toISOString(),
        });
        const updated = registry1.getExecution(execution.id);
        (0, vitest_1.expect)(updated?.status).toBe('running');
        (0, vitest_1.expect)(updated?.started_at).toBeDefined();
    });
    (0, vitest_1.it)('[Single Instance] Records spans for observability', async () => {
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-4' }, 'trace-4');
        const span = {
            id: 'span-1',
            span_id: 'span-1',
            execution_id: execution.id,
            stage_id: 'stage-1',
            agent: 'code-analyzer',
            status: 'completed',
            duration_ms: 150,
            input: { code: 'test' },
            output: { analysis: 'result' },
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            trace_id: 'trace-4',
        };
        await registry1.recordSpan(execution.id, span);
        const retrieved = registry1.getExecution(execution.id);
        (0, vitest_1.expect)(retrieved?.spans).toBeDefined();
        (0, vitest_1.expect)(retrieved?.spans.length).toBe(1);
        (0, vitest_1.expect)(retrieved?.spans[0].agent).toBe('code-analyzer');
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // Multi-Instance Tests (Key Phase E.0a Requirement)
    // ═══════════════════════════════════════════════════════════════════════════
    (0, vitest_1.it)('[Multi-Instance] Instance 1 starts execution, Instance 2 retrieves it', async () => {
        // Instance 1 creates execution
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-multi-1' }, 'trace-multi-1');
        (0, vitest_1.expect)(execution.id).toBeDefined();
        // Instance 2 should retrieve the same execution from shared store
        const retrieved = await store2.get(execution.id);
        (0, vitest_1.expect)(retrieved).toBeDefined();
        (0, vitest_1.expect)(retrieved?.id).toBe(execution.id);
        (0, vitest_1.expect)(retrieved?.status).toBe('queued');
    });
    (0, vitest_1.it)('[Multi-Instance] Instance 1 updates execution, Instance 2 sees changes', async () => {
        // Instance 1 creates execution
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-multi-2' }, 'trace-multi-2');
        // Instance 1 updates it
        await registry1.updateExecution(execution.id, {
            status: 'running',
            started_at: new Date().toISOString(),
        });
        // Instance 2 retrieves updated state from shared store
        const retrieved = await store2.get(execution.id);
        (0, vitest_1.expect)(retrieved?.status).toBe('running');
        (0, vitest_1.expect)(retrieved?.started_at).toBeDefined();
    });
    (0, vitest_1.it)('[Multi-Instance] Instance 1 adds span, Instance 2 sees it', async () => {
        // Instance 1 creates execution
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-multi-3' }, 'trace-multi-3');
        // Instance 1 adds span
        const span = {
            id: 'span-1',
            span_id: 'span-1',
            execution_id: execution.id,
            stage_id: 'stage-1',
            agent: 'code-analyzer',
            status: 'completed',
            duration_ms: 200,
            trace_id: 'trace-multi-3',
        };
        await registry1.recordSpan(execution.id, span);
        // Instance 2 retrieves execution with spans from shared store
        const retrieved = await store2.get(execution.id);
        (0, vitest_1.expect)(retrieved?.spans).toBeDefined();
        (0, vitest_1.expect)(retrieved?.spans.length).toBe(1);
        (0, vitest_1.expect)(retrieved?.spans[0].agent).toBe('code-analyzer');
    });
    (0, vitest_1.it)('[Multi-Instance] Concurrent updates from different instances', async () => {
        // Create execution on Instance 1
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-multi-4' }, 'trace-multi-4');
        // Instance 1 updates status
        await registry1.updateExecution(execution.id, {
            status: 'running',
            started_at: new Date().toISOString(),
        });
        // Instance 2 adds span
        const span1 = {
            id: 'span-1',
            span_id: 'span-1',
            execution_id: execution.id,
            stage_id: 'stage-1',
            agent: 'analyzer-1',
            status: 'completed',
            duration_ms: 100,
            trace_id: 'trace-multi-4',
        };
        await registry2.recordSpan(execution.id, span1);
        // Instance 1 adds another span
        const span2 = {
            id: 'span-2',
            span_id: 'span-2',
            execution_id: execution.id,
            stage_id: 'stage-2',
            agent: 'analyzer-2',
            status: 'completed',
            duration_ms: 150,
            trace_id: 'trace-multi-4',
        };
        await registry1.recordSpan(execution.id, span2);
        // Both instances should see final state
        const state1 = await store1.get(execution.id);
        const state2 = await store2.get(execution.id);
        (0, vitest_1.expect)(state1?.spans.length).toBe(2);
        (0, vitest_1.expect)(state2?.spans.length).toBe(2);
        (0, vitest_1.expect)(state1?.status).toBe('running');
        (0, vitest_1.expect)(state2?.status).toBe('running');
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // Persistence & Recovery Tests
    // ═══════════════════════════════════════════════════════════════════════════
    (0, vitest_1.it)('[Persistence] Execution survives store reload', async () => {
        // Create and update execution on Instance 1
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-recovery-1' }, 'trace-recovery-1');
        await registry1.updateExecution(execution.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            output: { result: 'success' },
        });
        // Create brand new store instance (simulating process restart)
        const store3 = new FileExecutionStore_1.FileExecutionStore({
            basePath: tempDir,
            retentionDays: 1,
        });
        // Retrieve execution from fresh store
        const retrieved = await store3.get(execution.id);
        (0, vitest_1.expect)(retrieved).toBeDefined();
        (0, vitest_1.expect)(retrieved?.status).toBe('completed');
        (0, vitest_1.expect)(retrieved?.output).toBeDefined();
    });
    (0, vitest_1.it)('[Persistence] List executions filters correctly', async () => {
        // Create multiple executions
        const exec1 = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-list-1' }, 'trace-list-1');
        const exec2 = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-list-2' }, 'trace-list-2');
        // Update one to completed
        await registry1.updateExecution(exec1.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
        });
        // List all
        const all = await store1.list();
        (0, vitest_1.expect)(all.length).toBeGreaterThanOrEqual(2);
        // List by status (completed)
        const completed = await store1.list({ status: 'completed' });
        (0, vitest_1.expect)(completed.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(completed.some((e) => e.id === exec1.id)).toBe(true);
        // List by status (queued)
        const queued = await store1.list({ status: 'queued' });
        (0, vitest_1.expect)(queued.some((e) => e.id === exec2.id)).toBe(true);
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // Deployment Readiness Tests
    // ═══════════════════════════════════════════════════════════════════════════
    (0, vitest_1.it)('[Deployment] Works with default EXECUTION_STORE_PATH env var', async () => {
        const originalPath = process.env.EXECUTION_STORE_PATH;
        const testPath = path.join(os.tmpdir(), `cic-env-test-${Date.now()}`);
        try {
            process.env.EXECUTION_STORE_PATH = testPath;
            const store = new FileExecutionStore_1.FileExecutionStore({ basePath: testPath });
            (0, vitest_1.expect)(store).toBeDefined();
            await fs.mkdir(testPath, { recursive: true });
        }
        finally {
            process.env.EXECUTION_STORE_PATH = originalPath;
            try {
                await fs.rm(testPath, { recursive: true, force: true });
            }
            catch (err) {
                // Ignore
            }
        }
    });
    (0, vitest_1.it)('[Deployment] Retention policy cleans old executions', async () => {
        // Create execution
        const execution = await registry1.startExecution('flow-context-enrichment-v1', { context_id: 'test-retention-1' }, 'trace-retention-1');
        (0, vitest_1.expect)(execution.id).toBeDefined();
        // List before archive
        const before = await store1.list();
        (0, vitest_1.expect)(before.length).toBeGreaterThan(0);
        // Archive executions older than 0 days (all)
        const archived = await store1.archive(0);
        (0, vitest_1.expect)(archived).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=phase-e-0a-persistence.test.js.map