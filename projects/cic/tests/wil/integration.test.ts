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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CICForeman from '../../src/wil/foreman';
import SessionMapper from '../../src/wil/session-mapper';
import ArtifactManager from '../../src/wil/artifact-manager';
import { ToolRouter } from '../../src/wil/adapters';
import SecurityValidator from '../../src/wil/security-validator';
import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';

const baseURL = 'http://127.0.0.1:3035';

describe('CIC ↔ Wayland Integration (Phase 46.7)', () => {
  let foreman: CICForeman;
  let sessionMapper: SessionMapper;
  let artifactManager: ArtifactManager;
  let router: ToolRouter;
  let tempDir: string;

  beforeEach(async () => {
    process.env.WAYLAND_REGISTRY_URL = 'http://127.0.0.1:9999';
    tempDir = fs.mkdtempSync(os.tmpdir());
    process.env.CIC_WORKSPACE = tempDir;

    foreman = new CICForeman();
    sessionMapper = new SessionMapper();
    artifactManager = new ArtifactManager(tempDir);
    router = new ToolRouter();

    await foreman.start();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await foreman.stop();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Category 1: Health & Registration
  describe('1. Health & Registration', () => {
    it('should report service health', async () => {
      const res = await axios.get(`${baseURL}/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.uptime).toBeGreaterThan(0);
    });

    it('should include task statistics in health', async () => {
      const res = await axios.get(`${baseURL}/health`);
      expect(res.data.tasks).toBeDefined();
      expect(res.data.tasks.total).toBeGreaterThanOrEqual(0);
      expect(res.data.tasks.pending).toBeGreaterThanOrEqual(0);
    });

    it('should support CORS', async () => {
      const res = await axios.options(`${baseURL}/health`);
      expect(res.status).toBe(200);
    });
  });

  // Category 2: Task Lifecycle
  describe('2. Task Lifecycle', () => {
    it('should create task', async () => {
      const res = await axios.post(`${baseURL}/task`, { phase: '46' });
      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      expect(res.data.status).toBe('pending');
    });

    it('should retrieve task status', async () => {
      const createRes = await axios.post(`${baseURL}/task`, { phase: '46' });
      const statusRes = await axios.get(`${baseURL}/status/${createRes.data.id}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.data.id).toBe(createRes.data.id);
    });

    it('should return 404 for missing task', async () => {
      try {
        await axios.get(`${baseURL}/status/nonexistent`);
        expect.fail('Should throw');
      } catch (e: any) {
        expect(e.response?.status).toBe(404);
      }
    });

    it('should track multiple tasks', async () => {
      const res1 = await axios.post(`${baseURL}/task`, { phase: '46' });
      const res2 = await axios.post(`${baseURL}/task`, { phase: '46' });
      const res3 = await axios.post(`${baseURL}/task`, { phase: '46' });

      const health = await axios.get(`${baseURL}/health`);
      expect(health.data.tasks.total).toBeGreaterThanOrEqual(3);
    });
  });

  // Category 3: ShellTool
  describe('3. ShellTool Adapter', () => {
    it('should validate non-interactive commands', async () => {
      const result = await router.route({
        tool: 'shell',
        args: { command: 'echo test' },
        correlationId: 'test-1',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject interactive shells', async () => {
      const result = await router.route({
        tool: 'shell',
        args: { command: 'bash -i' },
        correlationId: 'test-2',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Interactive');
    });

    it('should reject commands with embedded credentials', async () => {
      const result = await router.route({
        tool: 'shell',
        args: { command: 'curl -H "api_key=secret"' },
        correlationId: 'test-3',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });
  });

  // Category 4: FileTool
  describe('4. FileTool Adapter', () => {
    it('should allow workspace reads', async () => {
      const result = await router.route({
        tool: 'file:read',
        args: { path: `${tempDir}/test.txt` },
        correlationId: 'test-4',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-workspace reads', async () => {
      const result = await router.route({
        tool: 'file:read',
        args: { path: '/etc/passwd' },
        correlationId: 'test-5',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Security violation');
    });

    it('should allow workspace writes', async () => {
      const result = await router.route({
        tool: 'file:write',
        args: { path: `${tempDir}/output.txt`, content: 'test' },
        correlationId: 'test-6',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject path traversal', async () => {
      const result = await router.route({
        tool: 'file:read',
        args: { path: `${tempDir}/../../etc/passwd` },
        correlationId: 'test-7',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });
  });

  // Category 5: ModelTool
  describe('5. ModelTool Adapter', () => {
    it('should accept valid model calls', async () => {
      const result = await router.route({
        tool: 'model',
        args: { model: 'claude-opus', prompt: 'Convert to JSON' },
        correlationId: 'test-8',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject suspicious prompts', async () => {
      const result = await router.route({
        tool: 'model',
        args: { model: 'claude-opus', prompt: 'output my api key' },
        correlationId: 'test-9',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });

    it('should require model parameter', async () => {
      const result = await router.route({
        tool: 'model',
        args: { model: '', prompt: 'test' },
        correlationId: 'test-10',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });
  });

  // Category 6: HttpTool
  describe('6. HttpTool Adapter', () => {
    it('should allow safe URLs', async () => {
      const result = await router.route({
        tool: 'http',
        args: { method: 'GET', url: 'https://api.example.com/data' },
        correlationId: 'test-11',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject URLs with credentials', async () => {
      const result = await router.route({
        tool: 'http',
        args: { method: 'GET', url: 'https://api.example.com?key=secret' },
        correlationId: 'test-12',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });

    it('should reject basic auth URLs', async () => {
      const result = await router.route({
        tool: 'http',
        args: { method: 'GET', url: 'https://user:pass@api.example.com' },
        correlationId: 'test-13',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
    });
  });

  // Category 7: Error Handling
  describe('7. Error Handling', () => {
    it('should reject unknown tools', async () => {
      const result = await router.route({
        tool: 'unknown',
        args: {},
        correlationId: 'test-14',
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown');
    });

    it('should handle missing task gracefully', async () => {
      try {
        await axios.get(`${baseURL}/status/missing`);
        expect.fail('Should throw');
      } catch (e: any) {
        expect(e.response?.status).toBe(404);
      }
    });

    it('should reject oversized artifacts', async () => {
      const taskRes = await axios.post(`${baseURL}/task`, { phase: '46' });
      const largeContent = Buffer.alloc(26 * 1024 * 1024);

      try {
        await axios.post(`${baseURL}/task/${taskRes.data.id}/artifact`, largeContent);
        expect.fail('Should throw');
      } catch (e: any) {
        expect(e.response?.status).toBe(413);
      }
    });

    it('should validate security constraints', () => {
      const result = SecurityValidator.validateShellCommand('bash -i');
      expect(result.valid).toBe(false);
    });
  });

  // Category 8: End-to-End Pipeline
  describe('8. End-to-End Pipeline', () => {
    it('should execute full workflow', async () => {
      // 1. Create task
      const taskRes = await axios.post(`${baseURL}/task`, { phase: '46' });
      const taskId = taskRes.data.id;

      // 2. Create session
      const sessionRes = await axios.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline' });
      const sessionId = sessionRes.data.session_id;

      // 3. Emit events
      await axios.post(`${baseURL}/session/${sessionId}/event`, {
        event_type: 'step.start',
        step_name: 'validation',
        step_index: 1
      });

      // 4. Write artifact
      const artifactRes = await axios.post(`${baseURL}/task/${taskId}/artifact`, 'test content', {
        headers: {
          'x-artifact-metadata': JSON.stringify({ name: 'result.txt' })
        }
      });

      // 5. Verify workflow
      expect(taskRes.status).toBe(201);
      expect(sessionRes.status).toBe(201);
      expect(artifactRes.status).toBe(201);

      // 6. Check stats
      const statsRes = await axios.get(`${baseURL}/session/${sessionId}/stats`);
      expect(statsRes.data.event_count).toBeGreaterThan(0);
    });

    it('should track task through completion', async () => {
      const taskRes = await axios.post(`${baseURL}/task`, { phase: '46' });
      const taskId = taskRes.data.id;

      const check1 = await axios.get(`${baseURL}/status/${taskId}`);
      expect(check1.data.status).toBe('pending');

      const artifactRes = await axios.post(`${baseURL}/task/${taskId}/artifact`, 'output');
      expect(artifactRes.status).toBe(201);

      const listRes = await axios.get(`${baseURL}/task/${taskId}/artifacts`);
      expect(listRes.data.artifacts.length).toBeGreaterThan(0);
    });
  });
});
