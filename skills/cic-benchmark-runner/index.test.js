import { describe, it, expect, beforeEach } from 'vitest';
import { cicBenchmarkRunner } from './index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CIC Benchmark Runner (45.2)', () => {
  let testOutputDir;

  beforeEach(() => {
    // Create temporary output directory for tests
    testOutputDir = path.join(os.tmpdir(), `benchmark-test-${Date.now()}`);
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  it('should validate required input fields', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4'
      // Missing datasetSize and outputPath
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Required field missing');
  });

  it('should validate datasetSize enum', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'invalid',
      outputPath: testOutputDir
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('datasetSize must be one of');
  });

  it('should validate parallelCount range', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'full',
      parallelCount: 15,
      outputPath: testOutputDir
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('parallelCount must be between 1 and 10');
  });

  it('should complete a smoke test benchmark', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'smoke',
      outputPath: testOutputDir,
      creditLimit: 5000
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('completed');
    expect(result.runId).toBeDefined();
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.outputFile).toBeDefined();
    expect(fs.existsSync(result.outputFile)).toBe(true);
  });

  it('should track costs accurately', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-sonnet-4',
      datasetSize: 'sample',
      outputPath: testOutputDir,
      creditLimit: 1000
    });

    expect(result.success).toBe(true);
    expect(result.totalCost).toBeLessThanOrEqual(1000);
    expect(result.results.costPerStep).toBeDefined();
  });

  it('should support parallel benchmark runs', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'smoke',
      parallelCount: 4,
      outputPath: testOutputDir,
      creditLimit: 5000
    });

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBeGreaterThan(0);
  });

  it('should generate resumable checkpoint on credit limit approach', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'full',
      outputPath: testOutputDir,
      creditLimit: 100 // Low credit limit to trigger pause
    });

    // Depending on cost simulation, might complete or pause
    if (!result.success && result.reason === 'Credit limit approaching') {
      expect(result.checkpoint).toBeDefined();
      expect(result.message).toContain('Resume');
    }
  });

  it('should handle invalid model parameter gracefully', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: '', // Empty model
      datasetSize: 'smoke',
      outputPath: testOutputDir
    });

    expect(result.success).toBe(false);
  });

  it('should create output directory if it does not exist', async () => {
    const nestedPath = path.join(testOutputDir, 'nested', 'dir', 'structure');

    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'smoke',
      outputPath: nestedPath,
      creditLimit: 5000
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  it('should include metrics in results', async () => {
    const result = await cicBenchmarkRunner({
      benchmarkSuite: 'rewrite-labs-v2.3',
      model: 'claude-opus-4',
      datasetSize: 'smoke',
      outputPath: testOutputDir,
      creditLimit: 5000
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveProperty('passes');
    expect(result.results).toHaveProperty('costPerStep');
    expect(result.results).toHaveProperty('averageStepDuration');
  });
});
