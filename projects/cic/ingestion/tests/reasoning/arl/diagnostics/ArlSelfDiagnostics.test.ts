import { describe, it, expect, beforeEach } from 'vitest';
import { ArlSelfDiagnostics } from '../../../../src/reasoning/arl/diagnostics/ArlSelfDiagnostics';

describe('ArlSelfDiagnostics — Phase 7.14 Self-Monitoring', () => {
  let diagnostics: ArlSelfDiagnostics;

  beforeEach(() => {
    diagnostics = new ArlSelfDiagnostics();
  });

  describe('Subsystem Health Checks', () => {
    it('should report critical status when no scores recorded', () => {
      const report = diagnostics.runDiagnostics();

      const coherence = report.subsystemHealthChecks.find((s) => s.name === 'coherence');
      expect(coherence?.status).toBe('critical');
      expect(coherence?.issues).toContain('No scores recorded');
    });

    it('should track healthy subsystem with consistent scores', () => {
      // Record stable, high-quality scores
      for (let i = 0; i < 100; i++) {
        diagnostics.recordSubsystemScore('coherence', 0.85 + Math.random() * 0.1);
      }

      const report = diagnostics.runDiagnostics();
      const coherence = report.subsystemHealthChecks.find((s) => s.name === 'coherence');

      expect(coherence?.status).toBe('healthy');
      expect(coherence?.score).toBeGreaterThan(0.8);
    });

    it('should flag degraded subsystem with low average score', () => {
      // Record consistently low scores
      for (let i = 0; i < 100; i++) {
        diagnostics.recordSubsystemScore('semantic', 0.55 + Math.random() * 0.05);
      }

      const report = diagnostics.runDiagnostics();
      const semantic = report.subsystemHealthChecks.find((s) => s.name === 'semantic');

      expect(semantic?.status).toMatch(/degraded|critical/);
      expect(semantic?.issues).toContain(expect.stringMatching(/Low average score/));
    });

    it('should detect high variance (inconsistency)', () => {
      // Record highly variable scores
      const values = [0.95, 0.15, 0.85, 0.25, 0.90, 0.10, 0.88, 0.20];
      for (let i = 0; i < 100; i++) {
        const value = values[i % values.length];
        diagnostics.recordSubsystemScore('temporal', value + Math.random() * 0.02);
      }

      const report = diagnostics.runDiagnostics();
      const temporal = report.subsystemHealthChecks.find((s) => s.name === 'temporal');

      expect(temporal?.status).toMatch(/degraded|critical/);
      expect(temporal?.issues).toContain(expect.stringMatching(/High variance/));
    });

    it('should detect deteriorating trend', () => {
      // Record scores that get progressively worse
      for (let i = 0; i < 200; i++) {
        const score = 0.95 - (i / 200) * 0.3; // Trend from 0.95 to 0.65
        diagnostics.recordSubsystemScore('causal', score + Math.random() * 0.02);
      }

      const report = diagnostics.runDiagnostics();
      const causal = report.subsystemHealthChecks.find((s) => s.name === 'causal');

      expect(causal?.status).toMatch(/degraded|critical/);
      expect(causal?.issues).toContain(expect.stringMatching(/Deteriorating trend/));
    });
  });

  describe('Drift Analysis', () => {
    it('should report stable drift with no history', () => {
      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.driftTrend).toBe('stable');
      expect(report.driftAnalysis.seasonality).toBe(false);
    });

    it('should detect increasing drift trend', () => {
      // Record drift that increases over time
      for (let i = 0; i < 100; i++) {
        const drift = 0.1 + (i / 100) * 0.3; // Trend from 0.1 to 0.4
        diagnostics.recordDrift(drift);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.driftTrend).toBe('increasing');
      expect(report.reasoningIntegrity.issues).toContain(
        expect.stringMatching(/Drift magnitude is increasing/)
      );
    });

    it('should detect decreasing drift trend', () => {
      // Record drift that decreases over time
      for (let i = 0; i < 100; i++) {
        const drift = 0.4 - (i / 100) * 0.3; // Trend from 0.4 to 0.1
        diagnostics.recordDrift(drift);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.driftTrend).toBe('decreasing');
    });

    it('should detect drift anomalies', () => {
      // Record normal drift with occasional spikes
      for (let i = 0; i < 100; i++) {
        if (i === 50) {
          diagnostics.recordDrift(0.95); // Massive outlier
        } else {
          diagnostics.recordDrift(0.15 + Math.random() * 0.05);
        }
      }

      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.anomalies.length).toBeGreaterThan(0);
    });

    it('should detect seasonal patterns', () => {
      // Record pattern that repeats every 24 intervals
      for (let i = 0; i < 240; i++) {
        const pattern = i % 24 < 12 ? 0.2 : 0.35;
        diagnostics.recordDrift(pattern + Math.random() * 0.05);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.seasonality).toBe(true);
      expect(report.reasoningIntegrity.recommendations).toContain(
        expect.stringMatching(/Seasonal pattern/)
      );
    });
  });

  describe('Weighting Validation', () => {
    it('should validate weighting is consistent', () => {
      const report = diagnostics.runDiagnostics();

      expect(report.weightingValidation.status).toBe('valid');
      expect(report.weightingValidation.maxDeviation).toBeLessThan(0.05);
    });
  });

  describe('Threshold Calibration', () => {
    it('should identify overly strict thresholds (too many overrides)', () => {
      // Record many escalations + overrides (indicates too-strict threshold)
      for (let i = 0; i < 100; i++) {
        diagnostics.recordThresholdDecision('E001_composite_too_low', true, true);
      }

      const report = diagnostics.runDiagnostics();
      const composite = report.thresholdCalibration.compositeReasoningMin;

      expect(composite.appropriateness).toBe('too_low');
      expect(composite.overrideRate).toBeGreaterThan(0.5);
      expect(report.reasoningIntegrity.recommendations).toContain(
        expect.stringMatching(/relaxing this threshold/)
      );
    });

    it('should identify overly lenient thresholds (too few overrides)', () => {
      // Record few escalations (indicates threshold might be too lenient)
      diagnostics.recordThresholdDecision('E002_confidence_too_low', false, false);
      diagnostics.recordThresholdDecision('E002_confidence_too_low', false, false);

      const report = diagnostics.runDiagnostics();
      const confidence = report.thresholdCalibration.confidenceMin;

      // With very few escalations, appropriateness should be 'too_high'
      expect(confidence.appropriateness).toBe('too_high');
    });

    it('should identify optimal thresholds (moderate override rate)', () => {
      // Record mix: escalations with ~30% override rate = optimal
      for (let i = 0; i < 70; i++) {
        diagnostics.recordThresholdDecision('E003_drift_too_high', true, false);
      }
      for (let i = 0; i < 30; i++) {
        diagnostics.recordThresholdDecision('E003_drift_too_high', true, true);
      }

      const report = diagnostics.runDiagnostics();
      const drift = report.thresholdCalibration.driftMaxMagnitude;

      expect(drift.appropriateness).toBe('optimal');
      expect(drift.overrideRate).toBeCloseTo(0.3, 1);
    });
  });

  describe('Reasoning Integrity Score', () => {
    it('should report EXCELLENT integrity for healthy system', () => {
      // Record all healthy metrics
      for (let i = 0; i < 100; i++) {
        diagnostics.recordSubsystemScore('coherence', 0.85 + Math.random() * 0.1);
        diagnostics.recordSubsystemScore('semantic', 0.85 + Math.random() * 0.1);
        diagnostics.recordSubsystemScore('temporal', 0.85 + Math.random() * 0.1);
        diagnostics.recordSubsystemScore('causal', 0.85 + Math.random() * 0.1);
        diagnostics.recordSubsystemScore('narrative', 0.85 + Math.random() * 0.1);
        diagnostics.recordDrift(0.15 + Math.random() * 0.05);
      }
      // Record optimal threshold calibration
      for (let i = 0; i < 70; i++) {
        diagnostics.recordThresholdDecision('E001_composite_too_low', true, false);
      }
      for (let i = 0; i < 30; i++) {
        diagnostics.recordThresholdDecision('E001_composite_too_low', true, true);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.reasoningIntegrity.overall).toBeGreaterThan(0.9);
      expect(report.summary).toContain('EXCELLENT');
      expect(report.reasoningIntegrity.issues.length).toBe(0);
    });

    it('should report FAIR integrity for system with notable issues', () => {
      // Record some degraded subsystems
      for (let i = 0; i < 100; i++) {
        diagnostics.recordSubsystemScore('coherence', 0.6 + Math.random() * 0.1);
      }
      // Record increasing drift
      for (let i = 0; i < 100; i++) {
        diagnostics.recordDrift(0.1 + (i / 100) * 0.3);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.reasoningIntegrity.overall).toBeLessThan(0.75);
      expect(report.reasoningIntegrity.overall).toBeGreaterThan(0.6);
      expect(report.summary).toContain('FAIR');
      expect(report.reasoningIntegrity.issues.length).toBeGreaterThan(0);
      expect(report.reasoningIntegrity.recommendations.length).toBeGreaterThan(0);
    });

    it('should report POOR integrity for critical issues', () => {
      // Record all degraded subsystems
      for (let i = 0; i < 100; i++) {
        diagnostics.recordSubsystemScore('coherence', 0.3 + Math.random() * 0.2);
        diagnostics.recordSubsystemScore('semantic', 0.3 + Math.random() * 0.2);
        diagnostics.recordSubsystemScore('temporal', 0.3 + Math.random() * 0.2);
      }
      // Record rapidly increasing drift
      for (let i = 0; i < 100; i++) {
        diagnostics.recordDrift(0.0 + (i / 100) * 0.8);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.reasoningIntegrity.overall).toBeLessThan(0.6);
      expect(report.summary).toContain('POOR');
      expect(report.summary).toContain('critical');
    });
  });

  describe('Diagnostic Report Structure', () => {
    it('should generate complete diagnostic report', () => {
      const report = diagnostics.runDiagnostics();

      expect(report.phaseId).toBe('7.14');
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.reasoningIntegrity).toBeDefined();
      expect(report.subsystemHealthChecks.length).toBeGreaterThan(0);
      expect(report.driftAnalysis).toBeDefined();
      expect(report.weightingValidation).toBeDefined();
      expect(report.thresholdCalibration).toBeDefined();
      expect(report.summary).toBeTruthy();
    });

    it('should include all 5 subsystem checks', () => {
      const report = diagnostics.runDiagnostics();

      const subsystems = report.subsystemHealthChecks.map((s) => s.name);
      expect(subsystems).toContain('coherence');
      expect(subsystems).toContain('semantic');
      expect(subsystems).toContain('temporal');
      expect(subsystems).toContain('causal');
      expect(subsystems).toContain('narrative');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should diagnose healthy ARL in production use', () => {
      // Simulate 1000 normal operations
      for (let op = 0; op < 1000; op++) {
        for (const subsystem of ['coherence', 'semantic', 'temporal', 'causal', 'narrative']) {
          diagnostics.recordSubsystemScore(subsystem, 0.8 + Math.random() * 0.15);
        }
        diagnostics.recordDrift(0.15 + Math.random() * 0.08);
        diagnostics.recordThresholdDecision('E000_accept', false, false);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.reasoningIntegrity.overall).toBeGreaterThan(0.85);
      expect(report.driftAnalysis.driftTrend).toBe('stable');
    });

    it('should diagnose system drift requiring investigation', () => {
      // Simulate gradual degradation over time
      for (let i = 0; i < 500; i++) {
        const degradation = i / 500;
        for (const subsystem of ['coherence', 'semantic', 'temporal', 'causal', 'narrative']) {
          const score = 0.85 - degradation * 0.2;
          diagnostics.recordSubsystemScore(subsystem, score + Math.random() * 0.05);
        }
        diagnostics.recordDrift(0.15 + degradation * 0.3);
      }

      const report = diagnostics.runDiagnostics();

      expect(report.driftAnalysis.driftTrend).toBe('increasing');
      expect(report.reasoningIntegrity.issues.length).toBeGreaterThan(0);
    });
  });
});
