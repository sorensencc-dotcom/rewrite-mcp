import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ArtifactManager from '../../src/wil/artifact-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ArtifactManager (46.5)', () => {
  let manager: ArtifactManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cic-artifacts-'));
    manager = new ArtifactManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('artifact writing', () => {
    it('should write string artifact', async () => {
      const metadata = await manager.writeArtifact('task-1', 'test.txt', 'Hello World', 'text/plain');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBeDefined();
      expect(metadata?.name).toBe('test.txt');
      expect(metadata?.size_bytes).toBe(11);
      expect(metadata?.size_mb).toBeCloseTo(0);
    });

    it('should write buffer artifact', async () => {
      const buffer = Buffer.from('Binary content');
      const metadata = await manager.writeArtifact('task-2', 'binary.bin', buffer, 'application/octet-stream');

      expect(metadata).toBeDefined();
      expect(metadata?.size_bytes).toBe(buffer.length);
    });

    it('should reject artifacts exceeding size limit', async () => {
      const largeContent = Buffer.alloc(26 * 1024 * 1024); // 26 MB
      const metadata = await manager.writeArtifact('task-3', 'large.bin', largeContent);

      expect(metadata).toBeNull();
    });

    it('should calculate checksum', async () => {
      const metadata = await manager.writeArtifact('task-4', 'data.json', '{"test": true}');

      expect(metadata?.checksum).toBeDefined();
      expect(metadata?.checksum).toHaveLength(16);
    });

    it('should accept tags', async () => {
      const metadata = await manager.writeArtifact(
        'task-5',
        'report.txt',
        'Test report',
        'text/plain',
        ['urgent', 'review']
      );

      expect(metadata?.tags).toEqual(['urgent', 'review']);
    });
  });

  describe('artifact retrieval', () => {
    it('should retrieve artifact metadata', async () => {
      const written = await manager.writeArtifact('task-6', 'doc.txt', 'Content');
      const retrieved = manager.getArtifact('task-6', written!.id);

      expect(retrieved).toEqual(written);
    });

    it('should retrieve artifact content', async () => {
      const content = 'Test content';
      const written = await manager.writeArtifact('task-7', 'file.txt', content);
      const retrieved = manager.getArtifactContent('task-7', written!.id);

      expect(retrieved?.toString()).toBe(content);
    });

    it('should return null for missing artifact', () => {
      const content = manager.getArtifactContent('task-missing', 'artifact-missing');
      expect(content).toBeNull();
    });

    it('should list artifacts for task', async () => {
      await manager.writeArtifact('task-8', 'file1.txt', 'Content 1');
      await manager.writeArtifact('task-8', 'file2.txt', 'Content 2');
      await manager.writeArtifact('task-8', 'file3.txt', 'Content 3');

      const artifacts = manager.listArtifacts('task-8');
      expect(artifacts).toHaveLength(3);
    });
  });

  describe('artifact deletion', () => {
    it('should delete artifact', async () => {
      const written = await manager.writeArtifact('task-9', 'temp.txt', 'Content');
      const deleted = manager.deleteArtifact('task-9', written!.id);

      expect(deleted).toBe(true);
      expect(manager.getArtifact('task-9', written!.id)).toBeUndefined();
    });

    it('should return false for missing artifact', () => {
      const deleted = manager.deleteArtifact('task-missing', 'artifact-missing');
      expect(deleted).toBe(false);
    });
  });

  describe('metadata updates', () => {
    it('should update metadata', async () => {
      const written = await manager.writeArtifact('task-10', 'doc.txt', 'Content');
      const updated = manager.updateMetadata('task-10', written!.id, {
        tags: ['urgent'],
        session_color: '#FF5733'
      });

      expect(updated?.tags).toEqual(['urgent']);
      expect(updated?.session_color).toBe('#FF5733');
    });

    it('should return undefined for missing artifact', () => {
      const updated = manager.updateMetadata('task-missing', 'artifact-missing', {});
      expect(updated).toBeUndefined();
    });
  });

  describe('task statistics', () => {
    it('should compute task statistics', async () => {
      await manager.writeArtifact('task-11', 'file1.txt', 'Content 1');
      await manager.writeArtifact('task-11', 'file2.txt', 'Content 2');

      const stats = manager.getTaskStats('task-11');

      expect(stats.task_id).toBe('task-11');
      expect(stats.artifact_count).toBe(2);
      expect(stats.total_size_bytes).toBeGreaterThan(0);
    });

    it('should return empty stats for new task', () => {
      const stats = manager.getTaskStats('task-new');

      expect(stats.artifact_count).toBe(0);
      expect(stats.total_size_bytes).toBe(0);
      expect(stats.total_size_mb).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup task artifacts', async () => {
      await manager.writeArtifact('task-12', 'file1.txt', 'Content');
      await manager.writeArtifact('task-12', 'file2.txt', 'Content');

      manager.cleanup('task-12');

      expect(manager.listArtifacts('task-12')).toHaveLength(0);
    });
  });

  describe('size limits', () => {
    it('should track size in MB correctly', async () => {
      const smallContent = 'x'.repeat(1024); // 1 KB
      const metadata = await manager.writeArtifact('task-13', 'small.txt', smallContent);

      expect(metadata?.size_mb).toBeCloseTo(0.001, 3);
    });

    it('should accept maximum size artifact', async () => {
      const maxContent = Buffer.alloc(25 * 1024 * 1024); // Exactly 25 MB
      const metadata = await manager.writeArtifact('task-14', 'max.bin', maxContent);

      expect(metadata).toBeDefined();
      expect(metadata?.size_mb).toBeCloseTo(25, 1);
    });
  });
});
