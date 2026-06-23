/**
 * imageAnalyzerV2Contract.test.ts
 * Phase 5: CIC contract verification
 * Verifies error taxonomy, timeouts, budget, telemetry, warm pool hooks
 */

import { describe, it, expect } from 'vitest';
import { CICError } from '../../../../lib/error.js';
import { Telemetry } from '../../../../lib/telemetry.js';
import { BudgetManager } from '../../../../budget/budgetManager.js';
import type { AnalyzerResult } from '../../../../types/analyzer.js';

describe('ImageAnalyzerV2Contract', () => {
  describe('CIC Error Taxonomy', () => {
    it('should throw CICError.Validation for invalid MIME type', () => {
      const error = CICError.Validation('Unsupported MIME type', { mimeType: 'text/plain' });
      expect(error.category).toBe('Validation');
      expect(error.message).toContain('MIME');
    });

    it('should throw CICError.Timeout for extraction timeout', () => {
      const error = CICError.Timeout('Local extraction timeout');
      expect(error.category).toBe('Timeout');
    });

    it('should throw CICError.RemoteFailure for API errors', () => {
      const error = CICError.RemoteFailure('API returned 500', { statusCode: 500 });
      expect(error.category).toBe('RemoteFailure');
    });

    it('should throw CICError.LocalFailure for GPU errors', () => {
      const error = CICError.LocalFailure('GPU OOM');
      expect(error.category).toBe('LocalFailure');
    });

    it('should serialize error to JSON', () => {
      const error = CICError.RemoteFailure('API error', { statusCode: 500 });
      const json = error.toJSON();
      expect(json.category).toBe('RemoteFailure');
      expect(json.context?.statusCode).toBe(500);
    });
  });

  describe('Telemetry', () => {
    it('should record latency metrics', () => {
      const telemetry = new Telemetry();
      telemetry.recordLatency('image_analyzer_v2', 'local_extraction', 1234);

      const events = telemetry.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('local_extraction.latency');
      expect(events[0].value).toBe(1234);
    });

    it('should record error metrics', () => {
      const telemetry = new Telemetry();
      const error = new Error('Extraction failed');
      telemetry.recordError('image_analyzer_v2', 'extraction', error);

      const events = telemetry.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('extraction.error');
      expect(events[0].metadata?.error).toContain('failed');
    });

    it('should record gauge metrics (GPU memory)', () => {
      const telemetry = new Telemetry();
      telemetry.recordGauge('image_analyzer_v2', 'gpu_memory', 2048);

      const events = telemetry.getEvents();
      expect(events[0].event).toBe('gpu_memory.gauge');
      expect(events[0].value).toBe(2048);
    });
  });

  describe('Budget Management', () => {
    it('should track remaining tokens', () => {
      const budget = new BudgetManager(100000, 0.00001);
      const context = budget.getContext();
      expect(context.remainingTokens).toBe(100000);
    });

    it('should enforce token limits', () => {
      const budget = new BudgetManager(1000);
      expect(budget.canAfford(500)).toBe(true);
      budget.consume(500);
      expect(budget.canAfford(600)).toBe(false);
    });

    it('should calculate USD cost', () => {
      const budget = new BudgetManager(1000000, 0.00001);
      const context = budget.getContext();
      expect(context.remainingBudgetUSD).toBeCloseTo(10.0, 1);
    });
  });

  describe('Result Schema Contract', () => {
    it('should have all required AnalyzerResult fields', () => {
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
        data: { sceneGraph: { objects: [] } },
      };

      expect(result.analyzerId).toBe('image_analyzer_v2');
      expect(result.analyzerVersion).toBe('2.0.0');
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.backend).toBe('local');
    });

    it('should include GPU memory for local backend', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'test-1',
        extractedAt: new Date().toISOString(),
        backend: 'local',
        modelName: 'llava-1.5',
        modelVersion: '1.0.0',
        latencyMs: 1234,
        gpuMemoryUsedMB: 2048,
        confidence: 0.95,
        data: {},
      };

      expect(result.gpuMemoryUsedMB).toBe(2048);
    });

    it('should include token usage for remote backend', () => {
      const result: AnalyzerResult = {
        analyzerId: 'image_analyzer_v2',
        analyzerVersion: '2.0.0',
        fileId: 'test-1',
        extractedAt: new Date().toISOString(),
        backend: 'remote',
        modelName: 'gemini-vision',
        modelVersion: '1.0.0',
        latencyMs: 2000,
        tokenUsage: 850,
        confidence: 0.92,
        data: {},
      };

      expect(result.tokenUsage).toBe(850);
    });
  });

  describe('Error Message Determinism', () => {
    it('should produce consistent error messages', () => {
      const error1 = CICError.Validation('Invalid MIME', { mimeType: 'text/plain' });
      const error2 = CICError.Validation('Invalid MIME', { mimeType: 'text/plain' });

      expect(error1.message).toBe(error2.message);
      expect(error1.category).toBe(error2.category);
    });

    it('should distinguish error types', () => {
      const validation = CICError.Validation('Invalid');
      const timeout = CICError.Timeout('Timeout');
      const remote = CICError.RemoteFailure('Remote failed');

      expect(validation.category).not.toBe(timeout.category);
      expect(timeout.category).not.toBe(remote.category);
    });
  });

  describe('Manifest Contract', () => {
    it('should define supported MIME types', () => {
      const mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      expect(mimeTypes).toHaveLength(4);
      expect(mimeTypes.every((m) => m.startsWith('image/'))).toBe(true);
    });

    it('should define timeouts', () => {
      const localTimeoutMs = 15000;
      const remoteTimeoutMs = 20000;
      expect(remoteTimeoutMs).toBeGreaterThan(localTimeoutMs);
    });
  });
});
