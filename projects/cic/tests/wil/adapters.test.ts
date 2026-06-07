import { describe, it, expect } from 'vitest';
import { ShellToolAdapter, FileToolAdapter, ModelToolAdapter, HttpToolAdapter, ToolRouter } from '../../src/wil/adapters';

describe('Wayland Tool Adapters (46.2)', () => {
  const corrId = 'test-' + Date.now();

  describe('ShellToolAdapter', () => {
    const adapter = new ShellToolAdapter();

    it('should execute command', async () => {
      const result = await adapter.execute('echo test', corrId);
      expect(result.success).toBe(true);
      expect(result.correlationId).toBe(corrId);
    });

    it('should reject interactive shell', async () => {
      const result = await adapter.execute('bash -i', corrId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Interactive');
    });
  });

  describe('FileToolAdapter', () => {
    const adapter = new FileToolAdapter();

    it('should validate workspace scoping on read', async () => {
      const result = await adapter.read('/etc/passwd', corrId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('access denied');
    });

    it('should allow workspace reads', async () => {
      const result = await adapter.read('/cic_workspace/test.txt', corrId);
      expect(result.success).toBe(true);
    });

    it('should validate workspace scoping on write', async () => {
      const result = await adapter.write('/tmp/test.txt', 'content', corrId);
      expect(result.success).toBe(false);
    });

    it('should allow workspace writes', async () => {
      const result = await adapter.write('/cic_workspace/test.txt', 'content', corrId);
      expect(result.success).toBe(true);
    });

    it('should validate workspace scoping on delete', async () => {
      const result = await adapter.delete('/etc/hosts', corrId);
      expect(result.success).toBe(false);
    });
  });

  describe('ModelToolAdapter', () => {
    const adapter = new ModelToolAdapter();

    it('should call model', async () => {
      const result = await adapter.call('claude-opus', 'test prompt', corrId);
      expect(result.success).toBe(true);
      expect(result.output).toContain('claude-opus');
    });

    it('should validate model parameter', async () => {
      const result = await adapter.call('', 'prompt', corrId);
      expect(result.success).toBe(false);
    });

    it('should validate prompt parameter', async () => {
      const result = await adapter.call('claude-opus', '', corrId);
      expect(result.success).toBe(false);
    });
  });

  describe('HttpToolAdapter', () => {
    const adapter = new HttpToolAdapter();

    it('should make HTTP request', async () => {
      const result = await adapter.request('GET', 'https://api.example.com/data', corrId);
      expect(result.success).toBe(true);
    });

    it('should reject credentials in URL', async () => {
      const result = await adapter.request('GET', 'https://api.example.com?key=secret', corrId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Credentials');
    });

    it('should validate method', async () => {
      const result = await adapter.request('', 'https://api.example.com', corrId);
      expect(result.success).toBe(false);
    });
  });

  describe('ToolRouter', () => {
    const router = new ToolRouter();

    it('should route shell tool', async () => {
      const result = await router.route({
        tool: 'shell',
        args: { command: 'echo test' },
        correlationId: corrId,
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should route file:read tool', async () => {
      const result = await router.route({
        tool: 'file:read',
        args: { path: '/cic_workspace/test.txt' },
        correlationId: corrId,
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should route model tool', async () => {
      const result = await router.route({
        tool: 'model',
        args: { model: 'claude', prompt: 'test' },
        correlationId: corrId,
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should route http tool', async () => {
      const result = await router.route({
        tool: 'http',
        args: { method: 'GET', url: 'https://api.example.com' },
        correlationId: corrId,
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(true);
    });

    it('should reject unknown tool', async () => {
      const result = await router.route({
        tool: 'unknown',
        args: {},
        correlationId: corrId,
        timestamp: new Date().toISOString()
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown');
    });
  });
});
