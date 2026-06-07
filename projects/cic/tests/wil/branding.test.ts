import { describe, it, expect, beforeEach } from 'vitest';
import BrandingManager from '../../src/wil/branding';

describe('BrandingManager (46.8)', () => {
  let manager: BrandingManager;

  beforeEach(() => {
    manager = new BrandingManager();
  });

  describe('initialization', () => {
    it('should use default branding config', () => {
      const config = manager.getConfig();
      expect(config.brand).toBe('CIC');
      expect(config.primary_color).toBe('#0B1B2B');
      expect(config.accent_color).toBe('#35C2FF');
    });

    it('should allow custom config', () => {
      const custom = new BrandingManager({
        brand: 'Custom',
        primary_color: '#FF0000',
        accent_color: '#00FF00'
      });
      const config = custom.getConfig();

      expect(config.brand).toBe('Custom');
      expect(config.primary_color).toBe('#FF0000');
      expect(config.accent_color).toBe('#00FF00');
    });
  });

  describe('log event branding', () => {
    it('should add brand to log event', () => {
      const event = {
        timestamp: new Date().toISOString(),
        level: 'info',
        correlationId: 'test-123',
        event: 'task_created',
        taskId: 'task-1'
      };

      const branded = manager.brandLogEvent(event);

      expect(branded.brand).toBe('CIC');
      expect(branded.event).toBe('task_created');
      expect(branded.data?.taskId).toBe('task-1');
    });

    it('should handle missing fields', () => {
      const event = { event: 'test' };
      const branded = manager.brandLogEvent(event);

      expect(branded.brand).toBe('CIC');
      expect(branded.timestamp).toBeDefined();
      expect(branded.level).toBe('info');
    });
  });

  describe('artifact branding', () => {
    it('should add branding to artifact', () => {
      const artifact = {
        id: 'artifact-1',
        name: 'result.txt',
        size_bytes: 1024,
        size_mb: 0.001,
        created_at: new Date().toISOString()
      };

      const branded = manager.brandArtifact(artifact);

      expect(branded.brand).toBe('CIC');
      expect(branded.accent_color).toBe('#35C2FF');
      expect(branded.watermark).toBe('CIC');
      expect(branded.id).toBe('artifact-1');
    });

    it('should include all artifact fields', () => {
      const artifact = {
        id: 'artifact-2',
        name: 'data.json',
        size_bytes: 2048,
        size_mb: 0.002,
        created_at: new Date().toISOString()
      };

      const branded = manager.brandArtifact(artifact);

      expect(branded.id).toBe('artifact-2');
      expect(branded.name).toBe('data.json');
      expect(branded.size_bytes).toBe(2048);
      expect(branded.size_mb).toBe(0.002);
    });
  });

  describe('session payload branding', () => {
    it('should add branding to session', () => {
      const session = {
        session_id: 'session-1',
        pipeline_id: 'pipeline-1',
        created_at: new Date().toISOString()
      };

      const branded = manager.brandSessionPayload(session);

      expect(branded.session_brand).toBe('CIC');
      expect(branded.session_icon).toContain('session-icon');
      expect(branded.session_color).toBe('#35C2FF');
      expect(branded.session_id).toBe('session-1');
    });

    it('should include all session fields', () => {
      const session = {
        session_id: 'session-2',
        pipeline_id: 'pipeline-2',
        created_at: new Date().toISOString()
      };

      const branded = manager.brandSessionPayload(session);

      expect(branded.session_id).toBe('session-2');
      expect(branded.pipeline_id).toBe('pipeline-2');
    });
  });

  describe('agent graph node', () => {
    it('should generate agent graph node', () => {
      const node = manager.generateAgentGraphNode();

      expect(node.id).toBe('cic-foreman');
      expect(node.label).toBe('CIC');
      expect(node.type).toBe('agent');
      expect(node.color).toBe('#0B1B2B');
      expect(node.accent_color).toBe('#35C2FF');
    });

    it('should include icon and logo', () => {
      const node = manager.generateAgentGraphNode() as any;

      expect(node.icon).toBeDefined();
      expect(node.properties.logo).toBeDefined();
      expect(node.theme).toBe('dark');
    });
  });

  describe('asset manifest', () => {
    it('should generate asset manifest', () => {
      const manifest = manager.generateAssetManifest();

      expect(manifest.brand).toBe('CIC');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.assets).toBeDefined();
    });

    it('should include all asset types', () => {
      const manifest = manager.generateAssetManifest() as any;

      expect(manifest.assets.icons).toBeDefined();
      expect(manifest.assets.logos).toBeDefined();
      expect(manifest.assets.session).toBeDefined();
    });

    it('should include color configuration', () => {
      const manifest = manager.generateAssetManifest() as any;

      expect(manifest.colors.primary).toBe('#0B1B2B');
      expect(manifest.colors.accent).toBe('#35C2FF');
    });

    it('should list all icon sizes', () => {
      const manifest = manager.generateAssetManifest() as any;
      const icons = manifest.assets.icons;

      expect(icons['icon-16'].size).toBe(16);
      expect(icons['icon-32'].size).toBe(32);
      expect(icons['icon-64'].size).toBe(64);
      expect(icons['icon-128'].size).toBe(128);
    });
  });

  describe('configuration updates', () => {
    it('should update branding config', () => {
      manager.updateConfig({
        brand: 'CIC Pro',
        accent_color: '#FF00FF'
      });

      const config = manager.getConfig();

      expect(config.brand).toBe('CIC Pro');
      expect(config.accent_color).toBe('#FF00FF');
      expect(config.primary_color).toBe('#0B1B2B'); // Unchanged
    });

    it('should reflect updates in branded outputs', () => {
      manager.updateConfig({ brand: 'Updated' });

      const event = manager.brandLogEvent({ event: 'test' });
      const artifact = manager.brandArtifact({ id: 'a1', name: 'f', size_bytes: 0, size_mb: 0, created_at: '' });
      const session = manager.brandSessionPayload({ session_id: 's1', pipeline_id: 'p1', created_at: '' });

      expect(event.brand).toBe('Updated');
      expect(artifact.brand).toBe('Updated');
      expect(session.session_brand).toBe('Updated');
    });
  });
});
