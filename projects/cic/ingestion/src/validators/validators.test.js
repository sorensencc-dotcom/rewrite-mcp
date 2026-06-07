/**
 * validators.test.js | v1.0.0 | 2026-05-30
 * Validator modules integration test suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TelemetryCollector,
  AssessmentEngine,
  ScoringEngine,
  BaselineManager,
  EscalationManager,
  createCollector,
  createEngine,
  createScorer,
  createManager,
  createEscalationManager,
} from './index.js';

describe('Validators Integration Suite', () => {
  let telemetry, assessment, scoring, baseline, escalation;

  beforeEach(() => {
    telemetry = createCollector();
    assessment = createEngine();
    scoring = createScorer();
    baseline = createManager();
    escalation = createEscalationManager();
  });

  describe('TelemetryCollector', () => {
    it('should record assessments', () => {
      const mockOutput = { tags: ['test'] };
      const mockAssessment = { passed: true, score: 85 };

      telemetry.recordAssessment('skill-1', mockOutput, mockAssessment);

      expect(telemetry.metrics.totalItems).toBe(1);
      expect(telemetry.metrics.successCount).toBe(1);
    });

    it('should record escalations', () => {
      telemetry.recordEscalation('Drift detected', 'high');

      expect(telemetry.metrics.escalationCount).toBe(1);
    });

    it('should return metrics', () => {
      const metrics = telemetry.getMetrics();

      expect(metrics).toHaveProperty('totalItems');
      expect(metrics).toHaveProperty('successCount');
      expect(metrics).toHaveProperty('uptime');
    });
  });

  describe('AssessmentEngine', () => {
    it('should assess output', () => {
      const assessment_result = assessment.assess('skill-1', { type: 'text' }, { value: 'test output' });

      expect(assessment_result).toHaveProperty('skillId');
      expect(assessment_result).toHaveProperty('scores');
      expect(assessment_result).toHaveProperty('passed');
    });

    it('should score accuracy', () => {
      const score = assessment.scoreAccuracy({ tags: ['tag1'] });

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('ScoringEngine', () => {
    it('should score assessments', () => {
      const mockAssessment = {
        skillId: 'skill-1',
        scores: {
          accuracy: 85,
          consistency: 90,
          completeness: 80,
          efficiency: 75,
        },
      };

      const scoreResult = scoring.score(mockAssessment);

      expect(scoreResult).toHaveProperty('aggregate');
      expect(scoreResult).toHaveProperty('passed');
    });

    it('should get baseline', () => {
      const baseline_val = scoring.getBaseline();

      expect(baseline_val).toBeNull();
    });
  });

  describe('BaselineManager', () => {
    it('should set and get baseline', () => {
      const metrics = { accuracy: 85, latency: 145 };

      baseline.setBaseline('skill-1', metrics);

      const retrieved = baseline.getBaseline('skill-1');
      expect(retrieved).toBeDefined();
      expect(retrieved.metrics).toEqual(metrics);
    });

    it('should compare to baseline', () => {
      const metrics = { accuracy: 85, latency: 145 };
      baseline.setBaseline('skill-1', metrics);

      const comparison = baseline.compareToBaseline('skill-1', { accuracy: 82, latency: 160 });

      expect(comparison).toHaveProperty('hasDrift');
      expect(comparison).toHaveProperty('variance');
    });
  });

  describe('EscalationManager', () => {
    it('should evaluate escalation', () => {
      const mockAssessment = {
        skillId: 'skill-1',
        scores: { accuracy: 85, consistency: 90, completeness: 80, efficiency: 75 },
      };

      const mockScoringResult = { aggregate: 85, passed: true };

      const result = escalation.evaluate(mockAssessment, mockScoringResult, { hasDrift: false });

      expect(result).toHaveProperty('shouldEscalate');
      expect(result).toHaveProperty('severity');
    });
  });

  describe('Integration', () => {
    it('should work end-to-end', () => {
      // Create assessment
      const mockOutput = { result: 'test' };
      const assessmentResult = assessment.assess('skill-1', { text: 'input' }, mockOutput);

      // Score it
      const scoreResult = scoring.score(assessmentResult);

      // Track in telemetry
      telemetry.recordAssessment('skill-1', mockOutput, assessmentResult);

      expect(scoreResult.aggregate).toBeGreaterThanOrEqual(0);
      expect(telemetry.metrics.totalItems).toBe(1);
    });
  });
});
