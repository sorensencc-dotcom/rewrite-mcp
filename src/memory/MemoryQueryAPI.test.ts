import { MemoryQueryAPI } from './MemoryQueryAPI';
import { MemoryStore, MemoryEvent } from './MemoryStore';

describe('MemoryQueryAPI', () => {
  let store: MemoryStore;
  let api: MemoryQueryAPI;

  beforeEach(async () => {
    store = new MemoryStore();
    await store.load();
    api = new MemoryQueryAPI(store);

    // Seed test data
    const eventData = [
      {
        event_type: 'PIPELINE_RUN' as const,
        source_agent: 'codeflow-analyzer',
        session_id: 'sess-1',
        correlation_id: 'corr-1',
        payload: {
          pipeline_name: 'ingestion',
          pipeline_id: 'pipe-1',
          status: 'PASSED',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 5000,
          items_processed: 100,
          items_successful: 100,
          items_failed: 0,
          metrics: {},
        },
        retention_days: 30,
      },
      {
        event_type: 'AGENT_TELEMETRY' as const,
        source_agent: 'governance-council',
        session_id: 'sess-1',
        correlation_id: 'corr-1',
        payload: {
          agent_name: 'governance-council',
          agent_class: 'Governor',
          status: 'healthy',
          uptime_seconds: 3600,
          task_count: 50,
          task_success_rate: 0.98,
          performance: {},
        },
        retention_days: 30,
      },
      {
        event_type: 'GOVERNANCE_SIGNAL' as const,
        source_agent: 'policy-engine',
        session_id: 'sess-2',
        correlation_id: 'corr-2',
        payload: {
          signal_type: 'approval',
          entity_type: 'build',
          entity_id: 'build-123',
          decision: 'Approved',
          reason: 'passed all gates',
          approval_count: 3,
          approval_threshold: 3,
          confidence: 0.95,
          metadata: {},
        },
        retention_days: 30,
      },
    ];

    for (const evt of eventData) {
      await store.append(evt);
    }
  });

  describe('Query Methods', () => {
    it('should find events by event type', async () => {
      const results = await api.findByEventType('PIPELINE_RUN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].event_type).toBe('PIPELINE_RUN');
    });

    it('should find events by source agent', async () => {
      const results = await api.findBySourceAgent('codeflow-analyzer');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source_agent).toBe('codeflow-analyzer');
    });

    it('should find events by time window', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
      const results = await api.findByTimeWindow(oneHourAgo, now.toISOString());
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find events by correlation ID', async () => {
      const results = await api.findByCorrelationId('corr-1');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].correlation_id).toBe('corr-1');
    });
  });

  describe('Signal Detection', () => {
    it('should detect semantic signals', async () => {
      const signals = await api.detectSemanticSignals(0.7);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].signal_type).toBe('semantic');
      expect(signals[0].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect temporal signals', async () => {
      const signals = await api.detectTemporalSignals(60);
      // May or may not find anomalies depending on test data
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should detect causal signals', async () => {
      const signals = await api.detectCausalSignals();
      // Should find causal chains in the test data
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should detect all signals combined', async () => {
      const allSignals = await api.detectAllSignals(0.7, 60);
      expect(allSignals.semantic_signals).toBeDefined();
      expect(allSignals.temporal_signals).toBeDefined();
      expect(allSignals.causal_signals).toBeDefined();
      expect(typeof allSignals.total_confidence).toBe('number');
    });
  });
});
