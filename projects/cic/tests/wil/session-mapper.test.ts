import { describe, it, expect, beforeEach } from 'vitest';
import SessionMapper from '../../src/wil/session-mapper';

describe('SessionMapper (46.4)', () => {
  let mapper: SessionMapper;

  beforeEach(() => {
    mapper = new SessionMapper();
  });

  describe('session lifecycle', () => {
    it('should create session', () => {
      const session = mapper.createSession('pipeline-123');
      expect(session.session_id).toBeDefined();
      expect(session.pipeline_id).toBe('pipeline-123');
      expect(session.correlation_id).toBeDefined();
    });

    it('should retrieve session', () => {
      const created = mapper.createSession('pipeline-456');
      const retrieved = mapper.getSession(created.session_id);
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for missing session', () => {
      const result = mapper.getSession('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should close session', () => {
      const session = mapper.createSession('pipeline-789');
      mapper.closeSession(session.session_id);
      expect(mapper.getSession(session.session_id)).toBeUndefined();
    });
  });

  describe('event emission', () => {
    it('should emit step start event', () => {
      const session = mapper.createSession('pipeline-step-test');
      let emittedEvent: any = null;

      mapper.on('event', (event) => {
        emittedEvent = event;
      });

      mapper.emitStepStart(session.session_id, 'validation', 1);

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe('step.start');
      expect(emittedEvent.data.step_name).toBe('validation');
      expect(emittedEvent.data.step_index).toBe(1);
    });

    it('should emit step end event', () => {
      const session = mapper.createSession('pipeline-end-test');
      let emittedEvent: any = null;

      mapper.on('event', (event) => {
        emittedEvent = event;
      });

      mapper.emitStepEnd(session.session_id, 'validation', 150, 'success');

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe('step.end');
      expect(emittedEvent.data.duration_ms).toBe(150);
      expect(emittedEvent.data.status).toBe('success');
    });

    it('should emit step error event', () => {
      const session = mapper.createSession('pipeline-error-test');
      let emittedEvent: any = null;

      mapper.on('event', (event) => {
        emittedEvent = event;
      });

      mapper.emitStepError(session.session_id, 'validation', 'Schema validation failed');

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe('step.error');
      expect(emittedEvent.data.error).toBe('Schema validation failed');
    });

    it('should emit governance decision event', () => {
      const session = mapper.createSession('pipeline-gov-test');
      let emittedEvent: any = null;

      mapper.on('event', (event) => {
        emittedEvent = event;
      });

      mapper.emitGovernanceDecision(session.session_id, {
        rule: 'zone-ownership',
        verdict: 'approve',
        reasoning: 'Tool is in approved zone',
        metadata: { zone: 'core' }
      });

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe('governance.decision');
      expect(emittedEvent.data.verdict).toBe('approve');
    });

    it('should emit tool call event', () => {
      const session = mapper.createSession('pipeline-tool-test');
      let emittedEvent: any = null;

      mapper.on('event', (event) => {
        emittedEvent = event;
      });

      mapper.emitToolCall(session.session_id, {
        tool: 'file:read',
        args: { path: '/cic_workspace/test.txt' },
        duration_ms: 50,
        success: true
      });

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.type).toBe('tool.call');
      expect(emittedEvent.data.tool).toBe('file:read');
      expect(emittedEvent.data.success).toBe(true);
    });
  });

  describe('event history', () => {
    it('should buffer events', () => {
      const session = mapper.createSession('pipeline-buffer-test');
      mapper.emitStepStart(session.session_id, 'step1', 1);
      mapper.emitStepEnd(session.session_id, 'step1', 100, 'success');

      const history = mapper.getEventHistory(session.session_id);
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('step.start');
      expect(history[1].type).toBe('step.end');
    });

    it('should return empty array for missing session history', () => {
      const history = mapper.getEventHistory('nonexistent');
      expect(history).toEqual([]);
    });
  });

  describe('session stats', () => {
    it('should compute session statistics', () => {
      const session = mapper.createSession('pipeline-stats-test');

      mapper.emitStepStart(session.session_id, 'step1', 1);
      mapper.emitStepEnd(session.session_id, 'step1', 100, 'success');
      mapper.emitStepStart(session.session_id, 'step2', 2);
      mapper.emitStepEnd(session.session_id, 'step2', 200, 'success');
      mapper.emitGovernanceDecision(session.session_id, {
        rule: 'test-rule',
        verdict: 'approve',
        reasoning: 'test'
      });

      const stats = mapper.getSessionStats(session.session_id);

      expect(stats.event_count).toBe(5);
      expect(stats.step_starts).toBe(2);
      expect(stats.step_ends).toBe(2);
      expect(stats.governance_decisions).toBe(1);
      expect(stats.total_duration_ms).toBe(300);
    });

    it('should return empty stats for missing session', () => {
      const stats = mapper.getSessionStats('nonexistent');
      expect(stats).toEqual({});
    });
  });
});
