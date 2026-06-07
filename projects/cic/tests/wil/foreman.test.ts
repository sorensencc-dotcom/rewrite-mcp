import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CICForeman, { Task } from '../../src/wil/foreman';
import axios from 'axios';

describe('CIC Foreman (46.1)', () => {
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
