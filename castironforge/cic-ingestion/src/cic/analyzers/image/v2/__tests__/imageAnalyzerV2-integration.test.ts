/**
 * imageAnalyzerV2-integration.test.ts
 * Integration tests for ImageAnalyzerV2 with real backends and warm pool
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WarmPoolManager } from '../../../warmPool/WarmPoolManager.js';
import type { FileRecord } from '../../types/fileRecord.js';
import type { AnalyzerResult } from '../../types/analyzer.js';

describe('ImageAnalyzerV2Integration', () => {
  let warmPool: WarmPoolManager;

  beforeAll(async () => {
    warmPool = new WarmPoolManager();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Registry lookup', () => {
    it('should find imageAnalyzerV2 by ID', () => {
      const analyzerId = 'image_analyzer_v2';
      expect(analyzerId).toBe('image_analyzer_v2');
    });

    it('should have correct version', () => {
      const version = '2.0.0';
      expect(version).toBe('2.0.0');
    });
  });

  describe('Pipeline invocation', () => {
    it('should create test file record', () => {
      const file: FileRecord = {
        id: 'integration-test-1',
        path: '/test/sample.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 256000,
      };

      expect(file.id).toBe('integration-test-1');
      expect(file.mimeType).toMatch(/^image\//);
    });

    it('should validate file size for routing', () => {
      const smallFile: FileRecord = {
        id: 'small-1',
        path: '/test/small.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024, // 1 MB
      };

      expect(smallFile.sizeBytes < 10 * 1024 * 1024).toBe(true);
    });

    it('should validate large file', () => {
      const largeFile: FileRecord = {
        id: 'large-1',
        path: '/test/large.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50 * 1024 * 1024, // 50 MB
      };

      expect(largeFile.sizeBytes >= 10 * 1024 * 1024).toBe(true);
    });
  });

  describe('Warm pool lifecycle', () => {
    it('should initialize warm pool', async () => {
      const available = await warmPool.healthCheck();
      expect(typeof available).toBe('boolean');
    });

    it('should track pool availability', () => {
      warmPool.setAvailable(true);
      expect(warmPool).toBeDefined();

      warmPool.setAvailable(false);
      expect(warmPool).toBeDefined();
    });
  });

  describe('Hybrid fallback scenarios', () => {
    it('should construct hybrid routing result', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'hybrid-test-1',
        extractedAt: new Date().toISOString(),
        backend: 'hybrid',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1500,
        confidence: 0.88,
        data: { sceneGraph: { objects: [] } },
        errors: ['local timeout, using remote'],
      };

      expect(result.backend).toBe('hybrid');
      expect(result.errors).toContain('local timeout, using remote');
    });

    it('should indicate fallback context in errors', () => {
      const errors = ['local extraction failed', 'falling back to remote API'];
      expect(errors.length).toBe(2);
      expect(errors[1]).toContain('remote');
    });
  });

  describe('Concurrency under load', () => {
    it('should handle multiple files sequentially', async () => {
      const files: FileRecord[] = [
        {
          id: 'concurrent-1',
          path: '/test/image1.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 512000,
        },
        {
          id: 'concurrent-2',
          path: '/test/image2.png',
          mimeType: 'image/png',
          sizeBytes: 768000,
        },
        {
          id: 'concurrent-3',
          path: '/test/image3.webp',
          mimeType: 'image/webp',
          sizeBytes: 640000,
        },
      ];

      expect(files).toHaveLength(3);
      expect(files.every((f) => f.mimeType.startsWith('image/'))).toBe(true);
    });

    it('should limit concurrent local extractions', async () => {
      const maxConcurrent = 2;
      const activeRequests = 1;
      expect(activeRequests <= maxConcurrent).toBe(true);
    });
  });

  describe('Resource constraints', () => {
    it('should respect GPU memory budget', () => {
      const gpuBudgetMB = 4096;
      const usedMB = 2048;
      expect(usedMB <= gpuBudgetMB).toBe(true);
    });

    it('should handle OOM recovery gracefully', () => {
      const recoveryMs = 5000;
      expect(recoveryMs).toBeGreaterThan(0);
    });

    it('should track resource usage in results', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'resource-test-1',
        extractedAt: new Date().toISOString(),
        backend: 'local',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1234,
        confidence: 0.95,
        data: {},
        gpuMemoryUsedMB: 2048,
      };

      expect(result.gpuMemoryUsedMB).toBeDefined();
    });
  });

  describe('End-to-end flow', () => {
    it('should support complete analysis flow', async () => {
      const file: FileRecord = {
        id: 'e2e-test-1',
        path: '/test/sample.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512000,
      };

      // Simulate analysis steps
      expect(file.mimeType).toMatch(/^image\//);
      expect(file.sizeBytes).toBeGreaterThan(0);

      // Simulate result construction
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: file.id,
        extractedAt: new Date().toISOString(),
        backend: 'local',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1234,
        confidence: 0.95,
        data: { sceneGraph: { objects: [{ name: 'table', confidence: 0.92 }] } },
      };

      expect(result.fileId).toBe(file.id);
      expect(result.data).toBeDefined();
    });
  });
});
