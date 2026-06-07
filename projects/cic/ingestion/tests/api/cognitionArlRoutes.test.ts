import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { storeArlTrace, storeArlComposite, storeArlDrift } from '../../src/services/arlStore';

describe('Cognition ARL Routes', () => {
  beforeEach(() => {
    // Populate cache with test data
    const testTrace = [
      { subsystem: 'coherence', summary: 'Test coherence', score: 0.95 },
      { subsystem: 'semantic', summary: 'Test semantic', score: 0.88 },
    ];

    const testComposite = {
      coherence: 0.95,
      semantic: 0.88,
      temporal: 0.92,
      causal: 0.85,
      narrative: 0.90,
      overall: 0.90,
    };

    const testDrift = {
      semanticDrift: 0.05,
      temporalDrift: 0.08,
      narrativeDrift: 0.03,
      causalDrift: 0.12,
      compositeDrift: 0.07,
      overall: 0.07,
    };

    storeArlTrace('test-run-1', testTrace);
    storeArlComposite('test-run-1', testComposite);
    storeArlDrift('test-run-1', testDrift);
  });

  it('GET /arl/trace/:id should return reasoning trace', async () => {
    const res = await request(app).get('/api/v1/cognition/arl/trace/test-run-1');

    expect(res.status).toBe(200);
    expect(res.body.trace).toBeDefined();
    expect(res.body.trace.length).toBe(2);
    expect(res.body.trace[0].subsystem).toBe('coherence');
  });

  it('GET /arl/composite/:id should return composite scores', async () => {
    const res = await request(app).get('/api/v1/cognition/arl/composite/test-run-1');

    expect(res.status).toBe(200);
    expect(res.body.composite).toBeDefined();
    expect(res.body.composite.coherence).toBe(0.95);
    expect(res.body.composite.overall).toBe(0.90);
  });

  it('GET /arl/drift/:id should return drift vector', async () => {
    const res = await request(app).get('/api/v1/cognition/arl/drift/test-run-1');

    expect(res.status).toBe(200);
    expect(res.body.drift).toBeDefined();
    expect(res.body.drift.semanticDrift).toBe(0.05);
    expect(res.body.drift.overall).toBe(0.07);
  });

  it('GET /arl/trace/:id should return empty array for missing id', async () => {
    const res = await request(app).get('/api/v1/cognition/arl/trace/nonexistent');

    expect(res.status).toBe(200);
    expect(res.body.trace).toEqual([]);
  });
});
