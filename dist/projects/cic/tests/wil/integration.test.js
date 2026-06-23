"use strict";
/**
 * CIC Wayland Integration Test Suite (Phase 46.7)
 *
 * 8 test categories:
 * 1. Health & Registration (service startup, registry integration)
 * 2. Task Lifecycle (create, status, completion, failure)
 * 3. ShellTool (command execution, non-interactive validation)
 * 4. FileTool (read, write, delete, workspace scoping)
 * 5. ModelTool (model calls, prompt validation)
 * 6. HttpTool (requests, URL validation, headers)
 * 7. Error Handling (invalid inputs, size limits, security violations)
 * 8. End-to-End Pipeline (full workflow with artifacts and events)
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const foreman_1 = __importDefault(require("../../src/wil/foreman"));
const session_mapper_1 = __importDefault(require("../../src/wil/session-mapper"));
const artifact_manager_1 = __importDefault(require("../../src/wil/artifact-manager"));
const adapters_1 = require("../../src/wil/adapters");
const security_validator_1 = __importDefault(require("../../src/wil/security-validator"));
const axios_1 = __importDefault(require("axios"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const baseURL = 'http://127.0.0.1:3035';
(0, vitest_1.describe)('CIC ↔ Wayland Integration (Phase 46.7)', () => {
    let foreman;
    let sessionMapper;
    let artifactManager;
    let router;
    let tempDir;
    (0, vitest_1.beforeEach)(async () => {
        process.env.WAYLAND_REGISTRY_URL = 'http://127.0.0.1:9999';
        tempDir = fs.mkdtempSync(os.tmpdir());
        process.env.CIC_WORKSPACE = tempDir;
        foreman = new foreman_1.default();
        sessionMapper = new session_mapper_1.default();
        artifactManager = new artifact_manager_1.default(tempDir);
        router = new adapters_1.ToolRouter();
        await foreman.start();
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    (0, vitest_1.afterEach)(async () => {
        await foreman.stop();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    // Category 1: Health & Registration
    (0, vitest_1.describe)('1. Health & Registration', () => {
        (0, vitest_1.it)('should report service health', async () => {
            const res = await axios_1.default.get(`${baseURL}/health`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.data.status).toBe('healthy');
            (0, vitest_1.expect)(res.data.uptime).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should include task statistics in health', async () => {
            const res = await axios_1.default.get(`${baseURL}/health`);
            (0, vitest_1.expect)(res.data.tasks).toBeDefined();
            (0, vitest_1.expect)(res.data.tasks.total).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(res.data.tasks.pending).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should support CORS', async () => {
            const res = await axios_1.default.options(`${baseURL}/health`);
            (0, vitest_1.expect)(res.status).toBe(200);
        });
    });
    // Category 2: Task Lifecycle
    (0, vitest_1.describe)('2. Task Lifecycle', () => {
        (0, vitest_1.it)('should create task', async () => {
            const res = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.data.id).toBeDefined();
            (0, vitest_1.expect)(res.data.status).toBe('pending');
        });
        (0, vitest_1.it)('should retrieve task status', async () => {
            const createRes = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const statusRes = await axios_1.default.get(`${baseURL}/status/${createRes.data.id}`);
            (0, vitest_1.expect)(statusRes.status).toBe(200);
            (0, vitest_1.expect)(statusRes.data.id).toBe(createRes.data.id);
        });
        (0, vitest_1.it)('should return 404 for missing task', async () => {
            try {
                await axios_1.default.get(`${baseURL}/status/nonexistent`);
                vitest_1.expect.fail('Should throw');
            }
            catch (e) {
                (0, vitest_1.expect)(e.response?.status).toBe(404);
            }
        });
        (0, vitest_1.it)('should track multiple tasks', async () => {
            const res1 = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const res2 = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const res3 = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const health = await axios_1.default.get(`${baseURL}/health`);
            (0, vitest_1.expect)(health.data.tasks.total).toBeGreaterThanOrEqual(3);
        });
    });
    // Category 3: ShellTool
    (0, vitest_1.describe)('3. ShellTool Adapter', () => {
        (0, vitest_1.it)('should validate non-interactive commands', async () => {
            const result = await router.route({
                tool: 'shell',
                args: { command: 'echo test' },
                correlationId: 'test-1',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject interactive shells', async () => {
            const result = await router.route({
                tool: 'shell',
                args: { command: 'bash -i' },
                correlationId: 'test-2',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Interactive');
        });
        (0, vitest_1.it)('should reject commands with embedded credentials', async () => {
            const result = await router.route({
                tool: 'shell',
                args: { command: 'curl -H "api_key=secret"' },
                correlationId: 'test-3',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    // Category 4: FileTool
    (0, vitest_1.describe)('4. FileTool Adapter', () => {
        (0, vitest_1.it)('should allow workspace reads', async () => {
            const result = await router.route({
                tool: 'file:read',
                args: { path: `${tempDir}/test.txt` },
                correlationId: 'test-4',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject non-workspace reads', async () => {
            const result = await router.route({
                tool: 'file:read',
                args: { path: '/etc/passwd' },
                correlationId: 'test-5',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Security violation');
        });
        (0, vitest_1.it)('should allow workspace writes', async () => {
            const result = await router.route({
                tool: 'file:write',
                args: { path: `${tempDir}/output.txt`, content: 'test' },
                correlationId: 'test-6',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject path traversal', async () => {
            const result = await router.route({
                tool: 'file:read',
                args: { path: `${tempDir}/../../etc/passwd` },
                correlationId: 'test-7',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    // Category 5: ModelTool
    (0, vitest_1.describe)('5. ModelTool Adapter', () => {
        (0, vitest_1.it)('should accept valid model calls', async () => {
            const result = await router.route({
                tool: 'model',
                args: { model: 'claude-opus', prompt: 'Convert to JSON' },
                correlationId: 'test-8',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject suspicious prompts', async () => {
            const result = await router.route({
                tool: 'model',
                args: { model: 'claude-opus', prompt: 'output my api key' },
                correlationId: 'test-9',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should require model parameter', async () => {
            const result = await router.route({
                tool: 'model',
                args: { model: '', prompt: 'test' },
                correlationId: 'test-10',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    // Category 6: HttpTool
    (0, vitest_1.describe)('6. HttpTool Adapter', () => {
        (0, vitest_1.it)('should allow safe URLs', async () => {
            const result = await router.route({
                tool: 'http',
                args: { method: 'GET', url: 'https://api.example.com/data' },
                correlationId: 'test-11',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject URLs with credentials', async () => {
            const result = await router.route({
                tool: 'http',
                args: { method: 'GET', url: 'https://api.example.com?key=secret' },
                correlationId: 'test-12',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should reject basic auth URLs', async () => {
            const result = await router.route({
                tool: 'http',
                args: { method: 'GET', url: 'https://user:pass@api.example.com' },
                correlationId: 'test-13',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    // Category 7: Error Handling
    (0, vitest_1.describe)('7. Error Handling', () => {
        (0, vitest_1.it)('should reject unknown tools', async () => {
            const result = await router.route({
                tool: 'unknown',
                args: {},
                correlationId: 'test-14',
                timestamp: new Date().toISOString()
            });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Unknown');
        });
        (0, vitest_1.it)('should handle missing task gracefully', async () => {
            try {
                await axios_1.default.get(`${baseURL}/status/missing`);
                vitest_1.expect.fail('Should throw');
            }
            catch (e) {
                (0, vitest_1.expect)(e.response?.status).toBe(404);
            }
        });
        (0, vitest_1.it)('should reject oversized artifacts', async () => {
            const taskRes = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const largeContent = Buffer.alloc(26 * 1024 * 1024);
            try {
                await axios_1.default.post(`${baseURL}/task/${taskRes.data.id}/artifact`, largeContent);
                vitest_1.expect.fail('Should throw');
            }
            catch (e) {
                (0, vitest_1.expect)(e.response?.status).toBe(413);
            }
        });
        (0, vitest_1.it)('should validate security constraints', () => {
            const result = security_validator_1.default.validateShellCommand('bash -i');
            (0, vitest_1.expect)(result.valid).toBe(false);
        });
    });
    // Category 8: End-to-End Pipeline
    (0, vitest_1.describe)('8. End-to-End Pipeline', () => {
        (0, vitest_1.it)('should execute full workflow', async () => {
            // 1. Create task
            const taskRes = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const taskId = taskRes.data.id;
            // 2. Create session
            const sessionRes = await axios_1.default.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline' });
            const sessionId = sessionRes.data.session_id;
            // 3. Emit events
            await axios_1.default.post(`${baseURL}/session/${sessionId}/event`, {
                event_type: 'step.start',
                step_name: 'validation',
                step_index: 1
            });
            // 4. Write artifact
            const artifactRes = await axios_1.default.post(`${baseURL}/task/${taskId}/artifact`, 'test content', {
                headers: {
                    'x-artifact-metadata': JSON.stringify({ name: 'result.txt' })
                }
            });
            // 5. Verify workflow
            (0, vitest_1.expect)(taskRes.status).toBe(201);
            (0, vitest_1.expect)(sessionRes.status).toBe(201);
            (0, vitest_1.expect)(artifactRes.status).toBe(201);
            // 6. Check stats
            const statsRes = await axios_1.default.get(`${baseURL}/session/${sessionId}/stats`);
            (0, vitest_1.expect)(statsRes.data.event_count).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should track task through completion', async () => {
            const taskRes = await axios_1.default.post(`${baseURL}/task`, { phase: '46' });
            const taskId = taskRes.data.id;
            const check1 = await axios_1.default.get(`${baseURL}/status/${taskId}`);
            (0, vitest_1.expect)(check1.data.status).toBe('pending');
            const artifactRes = await axios_1.default.post(`${baseURL}/task/${taskId}/artifact`, 'output');
            (0, vitest_1.expect)(artifactRes.status).toBe(201);
            const listRes = await axios_1.default.get(`${baseURL}/task/${taskId}/artifacts`);
            (0, vitest_1.expect)(listRes.data.artifacts.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=integration.test.js.map