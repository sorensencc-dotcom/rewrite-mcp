import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CICForeman, { Task } from '../../src/wil/foreman';
import axios from 'axios';

describe('CIC Foreman (46.1 & 46.3)', () => {
  let foreman: CICForeman;
  const baseURL = 'http://127.0.0.1:3035';

  beforeEach(async () => {
    foreman = new CICForeman();
    await foreman.start();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await foreman.stop();
  });

  it('should be healthy', async () => {
    const response = await axios.get(`${baseURL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
    expect(response.data.tasks).toBeDefined();
  });

  it('should create task', async () => {
    const response = await axios.post(`${baseURL}/task`, { phase: '46.1' });
    expect(response.status).toBe(201);
    expect(response.data.id).toBeDefined();
    expect(response.data.status).toBe('pending');
  });

  it('should get task status', async () => {
    const createRes = await axios.post(`${baseURL}/task`, { phase: '46' });
    const taskId = createRes.data.id;

    const statusRes = await axios.get(`${baseURL}/status/${taskId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.data.id).toBe(taskId);
  });

  it('should return 404 for missing task', async () => {
    try {
      await axios.get(`${baseURL}/status/nonexistent`);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.response?.status).toBe(404);
    }
  });

  it('should return 404 for missing artifact', async () => {
    const createRes = await axios.post(`${baseURL}/task`, { phase: '46' });
    try {
      await axios.get(`${baseURL}/artifact/${createRes.data.id}/missing`);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.response?.status).toBe(404);
    }
  });

  it('should handle OPTIONS request', async () => {
    const response = await axios.options(`${baseURL}/health`);
    expect(response.status).toBe(200);
  });

  it('should return 404 for unknown route', async () => {
    try {
      await axios.get(`${baseURL}/unknown`);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.response?.status).toBe(404);
    }
  });

  it('should track task count in health', async () => {
    const h1 = await axios.get(`${baseURL}/health`);
    const count1 = h1.data.tasks.total;

    await axios.post(`${baseURL}/task`, { phase: '46' });
    const h2 = await axios.get(`${baseURL}/health`);
    const count2 = h2.data.tasks.total;

    expect(count2).toBe(count1 + 1);
  });
});

describe('CIC Foreman — Wayland Integration (46.3 & 46.4)', () => {
  let foreman: CICForeman;
  const baseURL = 'http://127.0.0.1:3035';

  beforeEach(async () => {
    // Set registry URL to non-existent endpoint (will fail gracefully in test)
    process.env.WAYLAND_REGISTRY_URL = 'http://127.0.0.1:9999';
    foreman = new CICForeman();
    await foreman.start();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await foreman.stop();
    delete process.env.WAYLAND_REGISTRY_URL;
  });

  it('should load agent manifest', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const manifestPath = path.join(__dirname, '../../cic_foreman.agent.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.agent_id).toBe('cic-foreman-wil-v1');
    expect(manifest.capabilities).toBeDefined();
    expect(manifest.security).toBeDefined();
    expect(manifest.observability).toBeDefined();
  });

  it('should have sandbox configuration', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const manifestPath = path.join(__dirname, '../../cic_foreman.agent.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.security.sandbox.enabled).toBe(true);
    expect(manifest.security.sandbox.root_path).toBe('/cic_workspace');
  });

  it('should have tool adapters configured', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const manifestPath = path.join(__dirname, '../../cic_foreman.agent.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.capabilities.tools).toHaveProperty('shell');
    expect(manifest.capabilities.tools).toHaveProperty('file');
    expect(manifest.capabilities.tools).toHaveProperty('model');
    expect(manifest.capabilities.tools).toHaveProperty('http');
  });

  it('should handle registry failures gracefully', async () => {
    const response = await axios.get(`${baseURL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });

  describe('session mapping (46.4)', () => {
    it('should create session', async () => {
      const response = await axios.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline-1' });
      expect(response.status).toBe(201);
      expect(response.data.session_id).toBeDefined();
      expect(response.data.pipeline_id).toBe('test-pipeline-1');
    });

    it('should retrieve session', async () => {
      const createRes = await axios.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline-2' });
      const sessionId = createRes.data.session_id;

      const getRes = await axios.get(`${baseURL}/session/${sessionId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.data.session_id).toBe(sessionId);
    });

    it('should return 404 for missing session', async () => {
      try {
        await axios.get(`${baseURL}/session/nonexistent`);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.response?.status).toBe(404);
      }
    });

    it('should emit session events', async () => {
      const createRes = await axios.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline-3' });
      const sessionId = createRes.data.session_id;

      const eventRes = await axios.post(`${baseURL}/session/${sessionId}/event`, {
        event_type: 'step.start',
        step_name: 'validation',
        step_index: 1
      });

      expect(eventRes.status).toBe(200);
      expect(eventRes.data.status).toBe('accepted');
    });

    it('should return session stats', async () => {
      const createRes = await axios.post(`${baseURL}/session`, { pipeline_id: 'test-pipeline-4' });
      const sessionId = createRes.data.session_id;

      await axios.post(`${baseURL}/session/${sessionId}/event`, {
        event_type: 'step.start',
        step_name: 'step1',
        step_index: 1
      });

      await axios.post(`${baseURL}/session/${sessionId}/event`, {
        event_type: 'step.end',
        step_name: 'step1',
        duration_ms: 150,
        status: 'success'
      });

      const statsRes = await axios.get(`${baseURL}/session/${sessionId}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.data.event_count).toBe(2);
      expect(statsRes.data.step_starts).toBe(1);
      expect(statsRes.data.step_ends).toBe(1);
      expect(statsRes.data.total_duration_ms).toBe(150);
    });
  });
});
