import { describe, it, expect } from '@jest/globals';
import {
  getArlTrace,
  getArlComposite,
  getArlDrift,
  storeArlTrace,
  storeArlComposite,
  storeArlDrift,
} from '../../src/services/arlStore';

describe('ARL Store', () => {
  it('should store and retrieve trace data', async () => {
    const trace = [
      { subsystem: 'coherence', summary: 'Test', score: 0.95 },
    ];

    storeArlTrace('test-1', trace);
    const retrieved = await getArlTrace('test-1');

    expect(retrieved).toEqual(trace);
  });

  it('should store and retrieve composite scores', async () => {
    const composite = {
      coherence: 0.95,
      semantic: 0.88,
      temporal: 0.92,
      causal: 0.85,
      narrative: 0.90,
      overall: 0.90,
    };

    storeArlComposite('test-2', composite);
    const retrieved = await getArlComposite('test-2');

    expect(retrieved).toEqual(composite);
  });

  it('should store and retrieve drift vector', async () => {
    const drift = {
      semanticDrift: 0.05,
      temporalDrift: 0.08,
      narrativeDrift: 0.03,
      causalDrift: 0.12,
      compositeDrift: 0.07,
      overall: 0.07,
    };

    storeArlDrift('test-3', drift);
    const retrieved = await getArlDrift('test-3');

    expect(retrieved).toEqual(drift);
  });

  it('should return empty array for missing trace', async () => {
    const retrieved = await getArlTrace('nonexistent');

    expect(retrieved).toEqual([]);
  });

  it('should return null for missing composite', async () => {
    const retrieved = await getArlComposite('nonexistent');

    expect(retrieved).toBeNull();
  });

  it('should return null for missing drift', async () => {
    const retrieved = await getArlDrift('nonexistent');

    expect(retrieved).toBeNull();
  });
});
