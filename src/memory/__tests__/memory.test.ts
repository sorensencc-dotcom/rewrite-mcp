import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryStore, resetMemoryStore, getMemoryStore } from '../MemoryStore';
import { MemoryHarvester, IngestRequest } from '../MemoryHarvester';
import { MemorySynthesizer, resetMemorySynthesizer } from '../MemorySynthesizer';

const TEST_STORE_PATH = path.join(__dirname, 'test_memory_store.json');

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(async () => {
    resetMemoryStore();
    // Clean up test file
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // File doesn't exist yet
    }
    store = new MemoryStore(TEST_STORE_PATH);
    await store.load();
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // Already deleted
    }
  });

  describe('append', () => {
    it('should append a valid ARPS_DELTA event', async () => {
      const event = await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'arps_synthesizer',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_abc123',
        payload: {
          change_type: 'phase_completion',
          phase_id: '23.1',
          old_value: 'PENDING',
          new_value: 'COMPLETE',
          git_commit: 'abc123',
          confidence: 1.0,
          affected_subsystems: ['Roadmap'],
        },
        retention_days: 90,
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.checksum).toBeDefined();
      expect(event.event_type).toBe('ARPS_DELTA');
    });

    it('should reject event with invalid schema', async () => {
      expect(
        store.append({
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: 'corr_abc123',
          payload: {
            // Missing required 'change_type'
            old_value: 'test',
            new_value: 'test',
            git_commit: 'abc',
            confidence: 0.5,
            affected_subsystems: [],
          },
          retention_days: 90,
        })
      ).rejects.toThrow('Schema validation failed');
    });

    it('should reject event with invalid session_id format', async () => {
      expect(
        store.append({
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          session_id: 'invalid_session', // Wrong format
          correlation_id: 'corr_abc123',
          payload: {
            change_type: 'phase_completion',
            old_value: 'test',
            new_value: 'test',
            git_commit: 'abc',
            confidence: 0.5,
            affected_subsystems: [],
          },
          retention_days: 90,
        })
      ).rejects.toThrow('Field validation failed');
    });

    it('should reject event with invalid correlation_id format', async () => {
      expect(
        store.append({
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: 'invalid', // Wrong format
          payload: {
            change_type: 'phase_completion',
            old_value: 'test',
            new_value: 'test',
            git_commit: 'abc',
            confidence: 0.5,
            affected_subsystems: [],
          },
          retention_days: 90,
        })
      ).rejects.toThrow('Field validation failed');
    });

    it('should compute and include checksum', async () => {
      const event = await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_abc123',
        payload: {
          change_type: 'phase_completion',
          old_value: 'OLD',
          new_value: 'NEW',
          git_commit: 'abc',
          confidence: 0.5,
          affected_subsystems: [],
        },
        retention_days: 90,
      });

      expect(event.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should persist to disk after append', async () => {
      await store.append({
        event_type: 'PIPELINE_RUN',
        source_agent: 'pipeline',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_test',
        payload: {
          pipeline_name: 'ingestion',
          pipeline_id: 'run_001',
          status: 'success',
          start_time: '2026-06-07T00:00:00Z',
          end_time: '2026-06-07T01:00:00Z',
          duration_ms: 3600000,
          items_processed: 100,
          items_successful: 100,
          items_failed: 0,
          metrics: {
            throughput_items_per_second: 0.028,
            error_rate_percent: 0,
            resource_usage_mb: 256,
          },
        },
        retention_days: 90,
      });

      // Verify file was written
      const stat = await fs.stat(TEST_STORE_PATH);
      expect(stat.size).toBeGreaterThan(0);
    });

    it('should persist all 6 event types', async () => {
      const eventTypes = [
        'ARPS_DELTA',
        'PIPELINE_RUN',
        'AGENT_TELEMETRY',
        'GOVERNANCE_SIGNAL',
        'APR_PLAN',
        'CRO_RUN',
      ] as const;

      for (const eventType of eventTypes) {
        const event = await store.append({
          event_type: eventType as any,
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: 'corr_test',
          payload: getPayloadForType(eventType),
          retention_days: 90,
        });

        expect(event.event_type).toBe(eventType);
      }

      const all = await store.getAll();
      expect(all.length).toBe(6);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create test data
      await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'arps',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_1',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      await store.append({
        event_type: 'PIPELINE_RUN',
        source_agent: 'pipeline',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_2',
        payload: getPayloadForType('PIPELINE_RUN'),
        retention_days: 90,
      });

      await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'arps',
        session_id: 'session_20260607_002',
        correlation_id: 'corr_3',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });
    });

    it('should filter by event_type', async () => {
      const results = await store.query({ event_type: 'ARPS_DELTA' });
      expect(results.length).toBe(2);
      expect(results.every(e => e.event_type === 'ARPS_DELTA')).toBe(true);
    });

    it('should filter by source_agent', async () => {
      const results = await store.query({ source_agent: 'arps' });
      expect(results.length).toBe(2);
      expect(results.every(e => e.source_agent === 'arps')).toBe(true);
    });

    it('should filter by session_id', async () => {
      const results = await store.query({ session_id: 'session_20260607_001' });
      expect(results.length).toBe(2);
    });

    it('should filter by correlation_id', async () => {
      const results = await store.query({ correlation_id: 'corr_1' });
      expect(results.length).toBe(1);
      expect(results[0].correlation_id).toBe('corr_1');
    });

    it('should apply limit', async () => {
      const results = await store.query({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should apply offset', async () => {
      const results = await store.query({ offset: 2, limit: 10 });
      expect(results.length).toBe(1);
    });

    it('should filter by timestamp range', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10000).toISOString();
      const results = await store.query({ before_timestamp: future });
      expect(results.length).toBe(3);
    });
  });

  describe('persistence', () => {
    it('should load events from disk on startup', async () => {
      const event1 = await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_test',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      // Create new store instance and load
      const store2 = new MemoryStore(TEST_STORE_PATH);
      await store2.load();

      const all = await store2.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(event1.id);
    });

    it('should detect and quarantine corrupted events', async () => {
      const event = await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_test',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      // Read file, corrupt checksum
      const data = await fs.readFile(TEST_STORE_PATH, 'utf-8');
      const events = JSON.parse(data);
      events[0].checksum = 'sha256:corrupted';
      await fs.writeFile(TEST_STORE_PATH, JSON.stringify(events));

      // Reload - should quarantine corrupted event
      const store2 = new MemoryStore(TEST_STORE_PATH);
      await store2.load();

      const all = await store2.getAll();
      expect(all.length).toBe(0); // Corrupted event removed
    });
  });

  describe('stats', () => {
    it('should return empty stats for new store', async () => {
      const stats = await store.getStats();
      expect(stats.total_events).toBe(0);
      expect(stats.corrupted_events).toBe(0);
      expect(stats.event_types).toEqual({});
    });

    it('should return event counts by type', async () => {
      await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_1',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      await store.append({
        event_type: 'PIPELINE_RUN',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_2',
        payload: getPayloadForType('PIPELINE_RUN'),
        retention_days: 90,
      });

      const stats = await store.getStats();
      expect(stats.total_events).toBe(2);
      expect(stats.event_types['ARPS_DELTA']).toBe(1);
      expect(stats.event_types['PIPELINE_RUN']).toBe(1);
    });
  });
});

describe('MemoryHarvester', () => {
  let store: MemoryStore;
  let harvester: MemoryHarvester;

  beforeEach(async () => {
    resetMemoryStore();
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // File doesn't exist yet
    }
    store = new MemoryStore(TEST_STORE_PATH);
    await store.load();
    harvester = new MemoryHarvester(store);
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // Already deleted
    }
  });

  describe('ingestEvent', () => {
    it('should ingest valid event', async () => {
      const result = await harvester.ingestEvent({
        event_type: 'ARPS_DELTA',
        source_agent: 'test_agent',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      expect(result.status).toBe('success');
      expect(result.event_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should auto-generate session and correlation IDs', async () => {
      const result = await harvester.ingestEvent({
        event_type: 'ARPS_DELTA',
        source_agent: 'test_agent',
        payload: getPayloadForType('ARPS_DELTA'),
      });

      expect(result.status).toBe('success');
      const all = await store.getAll();
      expect(all[0].session_id).toMatch(/^session_\d{8}_\d{3,}$/);
      expect(all[0].correlation_id).toMatch(/^corr_[a-z0-9]{6,}$/);
    });

    it('should reject invalid event', async () => {
      const result = await harvester.ingestEvent({
        event_type: 'ARPS_DELTA',
        source_agent: 'test_agent',
        payload: {
          // Missing required fields
          old_value: 'test',
        } as any,
      });

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should apply default retention for event type', async () => {
      const result = await harvester.ingestEvent({
        event_type: 'GOVERNANCE_SIGNAL',
        source_agent: 'test',
        payload: getPayloadForType('GOVERNANCE_SIGNAL'),
        // No retention_days specified
      });

      expect(result.status).toBe('success');
      const all = await store.getAll();
      expect(all[0].retention_days).toBe(365); // GOVERNANCE_SIGNAL default
    });

    it('should update metrics on success', async () => {
      await harvester.ingestEvent({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        payload: getPayloadForType('ARPS_DELTA'),
      });

      const metrics = harvester.getMetrics();
      expect(metrics.events_ingested).toBe(1);
      expect(metrics.events_by_type['ARPS_DELTA']).toBe(1);
      expect(metrics.events_rejected).toBe(0);
    });

    it('should update metrics on error', async () => {
      await harvester.ingestEvent({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        payload: {} as any, // Invalid
      });

      const metrics = harvester.getMetrics();
      expect(metrics.events_rejected).toBe(1);
      expect(metrics.last_error).toBeDefined();
    });
  });

  describe('ingestBatch', () => {
    it('should ingest multiple events', async () => {
      const results = await harvester.ingestBatch([
        {
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          payload: getPayloadForType('ARPS_DELTA'),
        },
        {
          event_type: 'PIPELINE_RUN',
          source_agent: 'test',
          payload: getPayloadForType('PIPELINE_RUN'),
        },
      ]);

      expect(results.length).toBe(2);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });

    it('should handle mixed valid/invalid batch', async () => {
      const results = await harvester.ingestBatch([
        {
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          payload: getPayloadForType('ARPS_DELTA'),
        },
        {
          event_type: 'ARPS_DELTA',
          source_agent: 'test',
          payload: {} as any, // Invalid
        },
      ]);

      expect(results.length).toBe(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
    });
  });

  describe('session management', () => {
    it('should reset session', () => {
      const oldSession = harvester.getMetrics().current_session;
      harvester.resetSession();
      const newSession = harvester.getMetrics().current_session;

      expect(newSession).not.toBe(oldSession);
      expect(newSession).toMatch(/^session_\d{8}_\d{3,}$/);
    });
  });
});

describe('MemorySynthesizer', () => {
  let store: MemoryStore;
  let synthesizer: MemorySynthesizer;

  beforeEach(async () => {
    resetMemoryStore();
    resetMemorySynthesizer();
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // File doesn't exist yet
    }
    store = new MemoryStore(TEST_STORE_PATH);
    await store.load();
    synthesizer = new MemorySynthesizer(store);
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch (e) {
      // Already deleted
    }
  });

  describe('generateWeeklySummary', () => {
    it('should generate weekly summary with no events', async () => {
      const summary = await synthesizer.generateWeeklySummary();

      expect(summary.period).toBe('weekly');
      expect(summary.event_count).toBe(0);
      expect(summary.trend).toBe('stable');
    });

    it('should count events by type', async () => {
      await store.append({
        event_type: 'ARPS_DELTA',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_1',
        payload: getPayloadForType('ARPS_DELTA'),
        retention_days: 90,
      });

      await store.append({
        event_type: 'PIPELINE_RUN',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_2',
        payload: getPayloadForType('PIPELINE_RUN'),
        retention_days: 90,
      });

      const summary = await synthesizer.generateWeeklySummary();

      expect(summary.event_count).toBe(2);
      expect(summary.event_counts_by_type['ARPS_DELTA']).toBe(1);
      expect(summary.event_counts_by_type['PIPELINE_RUN']).toBe(1);
    });

    it('should detect improving trend with successful pipelines', async () => {
      for (let i = 0; i < 3; i++) {
        await store.append({
          event_type: 'PIPELINE_RUN',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: `corr_${i}`,
          payload: {
            ...getPayloadForType('PIPELINE_RUN'),
            status: 'success',
            items_failed: 0,
          },
          retention_days: 90,
        });
      }

      const summary = await synthesizer.generateWeeklySummary();
      expect(summary.trend).toBe('improving');
    });

    it('should generate observations', async () => {
      await store.append({
        event_type: 'PIPELINE_RUN',
        source_agent: 'test',
        session_id: 'session_20260607_001',
        correlation_id: 'corr_1',
        payload: getPayloadForType('PIPELINE_RUN'),
        retention_days: 90,
      });

      const summary = await synthesizer.generateWeeklySummary();

      expect(summary.observations.length).toBeGreaterThan(0);
      expect(summary.observations[0]).toMatch(/pipeline/i);
    });

    it('should generate recommendations for low activity', async () => {
      const summary = await synthesizer.generateWeeklySummary();

      expect(summary.recommendations.length).toBeGreaterThan(0);
      expect(summary.recommendations[0]).toMatch(/low/i);
    });
  });

  describe('generateMonthlySummary', () => {
    it('should generate monthly summary', async () => {
      for (let i = 0; i < 5; i++) {
        await store.append({
          event_type: 'PIPELINE_RUN',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: `corr_${i}`,
          payload: getPayloadForType('PIPELINE_RUN'),
          retention_days: 90,
        });
      }

      const summary = await synthesizer.generateMonthlySummary();

      expect(summary.period).toBe('monthly');
      expect(summary.event_count).toBe(5);
      expect(summary.total_weeks).toBe(4);
    });

    it('should detect risk signals', async () => {
      for (let i = 0; i < 5; i++) {
        await store.append({
          event_type: 'PIPELINE_RUN',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: `corr_${i}`,
          payload: {
            ...getPayloadForType('PIPELINE_RUN'),
            status: 'failed',
            items_failed: 10,
          },
          retention_days: 90,
        });
      }

      const summary = await synthesizer.generateMonthlySummary();

      expect(summary.risk_signals.length).toBeGreaterThan(0);
      expect(summary.risk_signals[0]).toMatch(/failure/i);
    });

    it('should detect capability growth', async () => {
      for (let i = 0; i < 6; i++) {
        await store.append({
          event_type: 'APR_PLAN',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: `corr_${i}`,
          payload: getPayloadForType('APR_PLAN'),
          retention_days: 365,
        });
      }

      const summary = await synthesizer.generateMonthlySummary();

      expect(summary.capability_growth.length).toBeGreaterThan(0);
      expect(summary.capability_growth[0]).toMatch(/planning/i);
    });
  });

  describe('summaries retrieval', () => {
    it('should retrieve all summaries', async () => {
      await synthesizer.generateWeeklySummary();
      await synthesizer.generateMonthlySummary();

      const summaries = await synthesizer.getAllSummaries();

      expect(summaries.length).toBe(2);
    });

    it('should retrieve recent weekly summaries', async () => {
      await synthesizer.generateWeeklySummary();

      const recent = await synthesizer.getRecentWeeklySummaries(1);

      expect(recent.length).toBe(1);
      expect(recent[0].period).toBe('weekly');
    });

    it('should retrieve recent monthly summaries', async () => {
      await synthesizer.generateMonthlySummary();

      const recent = await synthesizer.getRecentMonthlySummaries(1);

      expect(recent.length).toBe(1);
      expect(recent[0].period).toBe('monthly');
    });
  });

  describe('trend analysis', () => {
    it('should calculate trend lines', async () => {
      for (let i = 0; i < 3; i++) {
        await store.append({
          event_type: 'PIPELINE_RUN',
          source_agent: 'test',
          session_id: 'session_20260607_001',
          correlation_id: `corr_${i}`,
          payload: {
            ...getPayloadForType('PIPELINE_RUN'),
            status: 'success',
          },
          retention_days: 90,
        });
      }

      const summary = await synthesizer.generateWeeklySummary();

      expect(summary.trend_lines.length).toBeGreaterThan(0);
      expect(summary.trend_lines[0].metric).toBeDefined();
      expect(summary.trend_lines[0].direction).toMatch(/improving|degrading|stable/);
    });
  });
});

// Helper function to generate valid payloads for each event type
function getPayloadForType(eventType: string): any {
  const payloads: Record<string, any> = {
    ARPS_DELTA: {
      change_type: 'phase_completion',
      phase_id: '23.1',
      old_value: 'PENDING',
      new_value: 'COMPLETE',
      git_commit: 'abc123',
      confidence: 1.0,
      affected_subsystems: ['Roadmap'],
    },
    PIPELINE_RUN: {
      pipeline_name: 'ingestion',
      pipeline_id: 'run_001',
      status: 'success',
      start_time: '2026-06-07T00:00:00Z',
      end_time: '2026-06-07T01:00:00Z',
      duration_ms: 3600000,
      items_processed: 100,
      items_successful: 100,
      items_failed: 0,
      metrics: {
        throughput_items_per_second: 0.028,
        error_rate_percent: 0,
        resource_usage_mb: 256,
      },
    },
    AGENT_TELEMETRY: {
      agent_name: 'test_agent',
      agent_class: 'ingestion',
      status: 'healthy',
      uptime_seconds: 86400,
      task_count: 1000,
      task_success_rate: 0.99,
      performance: {
        avg_task_duration_ms: 100,
        p95_task_duration_ms: 500,
        cpu_usage_percent: 10,
        memory_usage_mb: 256,
        error_rate_percent: 1.0,
      },
    },
    GOVERNANCE_SIGNAL: {
      signal_type: 'approval',
      entity_type: 'skill',
      entity_id: 'test_skill',
      decision: 'approved',
      reason: 'Auto-approved',
      approval_count: 3,
      approval_threshold: 2,
      metadata: {
        tier: 1,
      },
    },
    APR_PLAN: {
      plan_id: 'plan_001',
      goal: 'Test goal',
      plan_type: 'feature_development',
      status: 'generated',
      task_count: 3,
      task_graph: [
        { id: 'task_1', name: 'Task 1', depends_on: [], estimated_effort_hours: 2 },
      ],
      critical_path_hours: 2,
      risk_level: 'low',
      risk_factors: [],
      agent_consensus_score: 1.0,
      agents_involved: ['agent_1'],
    },
    CRO_RUN: {
      run_id: 'run_001',
      plan_id: 'plan_001',
      status: 'completed',
      start_time: '2026-06-07T00:00:00Z',
      end_time: '2026-06-07T01:00:00Z',
      duration_ms: 3600000,
      step_count: 1,
      step_results: [
        {
          step_id: 'step_1',
          task_id: 'task_1',
          agent_name: 'agent_1',
          status: 'success',
          duration_ms: 1000,
          output_size_bytes: 4096,
        },
      ],
    },
  };

  return payloads[eventType];
}
