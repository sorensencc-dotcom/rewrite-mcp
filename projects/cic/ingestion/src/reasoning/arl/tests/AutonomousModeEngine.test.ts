import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousModeEngine } from '../engine/AutonomousModeEngine';

describe('Batch 4, Phase 7.25: Autonomous Mode Engine', () => {
  let engine: AutonomousModeEngine;

  beforeEach(() => {
    engine = new AutonomousModeEngine();
  });

  it('should initialize autonomous mode with self-governing thresholds', () => {
    const state = engine.initializeAutonomousMode();

    expect(state.isAutonomous).toBe(true);
    expect(state.thresholds).toHaveLength(4);
    expect(state.autonomyScore).toBeGreaterThan(0.8);
  });

  it('should make autonomous decisions', () => {
    const state = engine.initializeAutonomousMode();

    const { decision, updatedState } = engine.makeAutonomousDecision(0.85, 0.9, state);

    expect(decision.verdict).toBe('ACCEPT');
    expect(decision.confidence).toBe(0.9);
    expect(updatedState.recentDecisions).toHaveLength(1);
  });

  it('should flag decisions requiring operator review', () => {
    const state = engine.initializeAutonomousMode();

    const { decision: lowConfidence } = engine.makeAutonomousDecision(0.5, 0.6, state);
    expect(lowConfidence.requiresOperatorReview).toBe(true);

    const { decision: highConfidence } = engine.makeAutonomousDecision(0.75, 0.95, state);
    expect(highConfidence.requiresOperatorReview).toBe(false);
  });

  it('should autonomously reject expansions', () => {
    const state = engine.initializeAutonomousMode();

    const updated = engine.autonomouslyReject('High drift detected', 0.7, state);

    expect(updated.rejections).toHaveLength(1);
    expect(updated.autonomyScore).toBeLessThan(state.autonomyScore);
  });

  it('should autonomously escalate complex cases', () => {
    const state = engine.initializeAutonomousMode();

    const updated = engine.autonomouslyEscalate('operator_arbitration', 0.8, state);

    expect(updated.escalations).toHaveLength(1);
  });

  it('should autonomously stabilize system', () => {
    const state = engine.initializeAutonomousMode();

    const updated = engine.autonomouslyStabilize('Adjust memory consistency thresholds', state);

    expect(updated.stabilizations).toHaveLength(1);
    expect(updated.autonomyScore).toBeGreaterThan(state.autonomyScore);
  });

  it('should maintain reasonable autonomy score bounds', () => {
    let state = engine.initializeAutonomousMode();

    for (let i = 0; i < 20; i++) {
      state = engine.autonomouslyReject(`Rejection ${i}`, 0.5, state);
    }

    expect(state.autonomyScore).toBeGreaterThanOrEqual(0);
    expect(state.autonomyScore).toBeLessThanOrEqual(1);
  });

  it('should adapt thresholds for autonomous operation', () => {
    const state = engine.initializeAutonomousMode();

    state.thresholds.forEach((threshold) => {
      expect(threshold.adaptiveRange.min).toBeLessThan(threshold.adaptiveRange.max);
      expect(threshold.currentValue).toBeGreaterThanOrEqual(threshold.adaptiveRange.min);
      expect(threshold.currentValue).toBeLessThanOrEqual(threshold.adaptiveRange.max);
    });
  });
});
