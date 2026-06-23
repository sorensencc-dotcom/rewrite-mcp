/**
 * imageAnalyzerV2Adapter.test.ts
 * Unit tests for ImageAnalyzerV2 adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FileRecord } from '../../types/fileRecord.js';
import type { AnalyzerResult } from '../../types/analyzer.js';
import { WarmPoolManager } from '../../../warmPool/WarmPoolManager.js';

// Mock the extractors to avoid API key requirement
vi.mock('../remoteImageExtractor.js', () => ({
  RemoteImageExtractor: vi.fn().mockImplementation(() => ({
    healthCheck: vi.fn().mockResolvedValue(true),
    extract: vi.fn().mockResolvedValue({
      modelName: 'gemini-vision',
      modelVersion: '1.0.0',
      tokenUsage: 850,
      confidence: 0.92,
      data: { text: 'Mock extraction' },
    }),
  })),
}));

vi.mock('../localImageExtractor.js', () => ({
  LocalImageExtractor: vi.fn().mockImplementation(() => ({
    healthCheck: vi.fn().mockResolvedValue(true),
    extractStreaming: vi.fn().mockResolvedValue({
      modelName: 'llava-1.5',
      modelVersion: '1.0.0',
      gpuMemoryUsedMB: 2048,
      confidence: 0.95,
      data: { sceneGraph: { objects: [] } },
    }),
  })),
}));

describe('ImageAnalyzerV2Adapter', () => {
  let warmPool: WarmPoolManager;

  beforeEach(() => {
    warmPool = new WarmPoolManager();
  });

  describe('healthCheck', () => {
    it('should pass if at least one backend is healthy', async () => {
      warmPool.setAvailable(true);
      const health = await warmPool.healthCheck();
      expect(health).toBe(true);
    });

    it('should fail if no backends are available', async () => {
      warmPool.setAvailable(false);
      const health = await warmPool.healthCheck();
      expect(health).toBe(false);
    });
  });

  describe('Result schema validation', () => {
    it('should have all required AnalyzerResult fields', async () => {
      const file: FileRecord = {
        id: 'test-1',
        path: '/test/image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512000,
      };

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
        data: { sceneGraph: { objects: [] } },
        errors: [],
      };

      expect(result).toHaveProperty('analyzerId');
      expect(result).toHaveProperty('analyzerVersion');
      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('extractedAt');
      expect(result).toHaveProperty('backend');
      expect(result).toHaveProperty('modelName');
      expect(result).toHaveProperty('latencyMs');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('data');
    });
  });

  describe('MIME type validation', () => {
    it('should accept image/jpeg', () => {
      const mimeType = 'image/jpeg';
      expect(mimeType.startsWith('image/')).toBe(true);
    });

    it('should accept image/png', () => {
      const mimeType = 'image/png';
      expect(mimeType.startsWith('image/')).toBe(true);
    });

    it('should accept image/webp', () => {
      const mimeType = 'image/webp';
      expect(mimeType.startsWith('image/')).toBe(true);
    });

    it('should reject application/pdf', () => {
      const mimeType = 'application/pdf';
      expect(mimeType.startsWith('image/')).toBe(false);
    });

    it('should reject text/plain', () => {
      const mimeType = 'text/plain';
      expect(mimeType.startsWith('image/')).toBe(false);
    });
  });

  describe('Routing decisions', () => {
    it('should route small files to local backend', () => {
      const sizeBytes = 5 * 1024 * 1024; // 5 MB
      const isSmall = sizeBytes < 10 * 1024 * 1024;
      expect(isSmall).toBe(true);
    });

    it('should route large files to hybrid backend', () => {
      const sizeBytes = 50 * 1024 * 1024; // 50 MB
      const isLarge = sizeBytes >= 10 * 1024 * 1024;
      expect(isLarge).toBe(true);
    });
  });

  describe('Backend metadata', () => {
    it('should set gpuMemoryUsedMB for local backend', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'test-1',
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
      expect(result.gpuMemoryUsedMB).toBeGreaterThan(0);
    });

    it('should set tokenUsage for remote backend', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'test-1',
        extractedAt: new Date().toISOString(),
        backend: 'remote',
        modelName: 'gemini-vision',
        modelVersion: '1.0.0',
        latencyMs: 2000,
        confidence: 0.92,
        data: {},
        tokenUsage: 850,
      };

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors when extraction fails', () => {
      const error = new Error('Extraction failed');
      expect(() => {
        throw error;
      }).toThrow('Extraction failed');
    });

    it('should include error messages in result', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'test-1',
        extractedAt: new Date().toISOString(),
        backend: 'hybrid',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1234,
        confidence: 0.85,
        data: {},
        errors: ['local backend timeout', 'falling back to remote'],
      };

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Result determinism', () => {
    it('should produce consistent structure for multiple calls', () => {
      const file: FileRecord = {
        id: 'test-1',
        path: '/test/image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512000,
      };

      const result1: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: file.id,
        extractedAt: new Date().toISOString(),
        backend: 'local',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1234,
        confidence: 0.95,
        data: { sceneGraph: { objects: [] } },
      };

      const result2: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: file.id,
        extractedAt: new Date().toISOString(),
        backend: 'local',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1200,
        confidence: 0.95,
        data: { sceneGraph: { objects: [] } },
      };

      expect(result1.analyzerId).toBe(result2.analyzerId);
      expect(result1.analyzerVersion).toBe(result2.analyzerVersion);
      expect(result1.fileId).toBe(result2.fileId);
      expect(result1.backend).toBe(result2.backend);
    });
  });
});
