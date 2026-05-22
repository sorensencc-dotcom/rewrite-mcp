// filename: mitigation.js
// semver: 1.1.0
// date: 2026-05-21
// MAS Phase 29/30 — Autonomous Mitigation Engine with Deep Introspection

import { getBlackboard } from './blackboard.js';
import { recordIntrospection, simulateCounterfactual, calculateConfidence } from './introspection.js';

/**
 * Mitigation State
 */
let mitigationState = {
  mode: 'normal', // normal | elevated | critical
  lastUpdatedAt: null,

  // Global policy overrides
  policyOverrides: {
    maxRetriesDelta: 0,
    backoffMultiplier: 1.0,
    jitterEnabled: false
  },

  // Per-agent overrides
  agentOverrides: {
    // e.g. ENRICH: { backoffMultiplier: 1.5, safePromptMode: true }
  },

  recentDirectives: []
};

/**
 * Main entry point called by the orchestrator/telemetry loop.
 * Analyzes recent signals from the blackboard and updates the mitigation state.
 */
export function updateMitigationState() {
  const bb = getBlackboard();
  const signals = bb.signals || [];
  const decisions = bb.decisions || [];

  if (signals.length < 5) return mitigationState;

  const timestamp = Date.now();
  const recentSignals = signals.slice(-20);
  const recentDecisions = decisions.slice(-20);

  // 1. Calculate Stability / Recovery Score
  const stability = _calculateStability(recentSignals, recentDecisions);
  
  // 2. Evaluate Global Mode
  const modeBefore = mitigationState.mode;
  const newMode = _evaluateGlobalMode(stability);
  mitigationState.mode = newMode;

  // 3. Apply Policy Mitigation
  _applyPolicyMitigation(newMode, stability);

  // 4. Apply Agent Mitigation
  _applyAgentMitigation(recentSignals, recentDecisions);

  // 5. Recovery Logic
  _applyRecoveryLogic(stability);

  // 6. Record Introspection (Phase 30)
  const featureAttribution = {
    avgDrift: stability.avgDrift,
    avgConfidence: stability.avgConf,
    rerunFrequency: stability.rerunFreq / 100,
    recoveryScore: (100 - stability.score) / 100
  };

  const introspectionRecord = {
    modeBefore,
    modeAfter: newMode,
    stability,
    featureAttribution,
    confidence: calculateConfidence(stability, featureAttribution),
    counterfactuals: simulateCounterfactual(stability, mitigationState),
    decisionPath: [
      `Stability score calculated: ${stability.score.toFixed(2)}`,
      `Global mode evaluated: ${newMode.toUpperCase()}`,
      newMode !== 'normal' ? `Policy mitigation applied for mode ${newMode}` : 'Standard policy maintained'
    ]
  };

  recordIntrospection(introspectionRecord);

  mitigationState.lastUpdatedAt = timestamp;
  return mitigationState;
}

export function getMitigationState() {
  return mitigationState;
}

// ── Private Logic ──────────────────────────────────────────────────

function _calculateStability(signals, decisions) {
  const avgDrift = signals.reduce((sum, s) => sum + s.drift, 0) / signals.length;
  const avgConf = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
  
  const rerunCount = decisions.filter(d => d.action === 'rerunAgent').length;
  const rerunFreq = (rerunCount / decisions.length) * 100;

  // Simple recovery score (0-100)
  let score = 100 
    - (avgDrift * 50) 
    - ((1 - avgConf) * 30) 
    - (rerunFreq * 0.5);

  return {
    score: Math.max(0, Math.min(100, score)),
    avgDrift,
    avgConf,
    rerunFreq
  };
}

function _evaluateGlobalMode(stability) {
  if (stability.score < 60) return 'critical';
  if (stability.score < 75 || stability.rerunFreq > 20) return 'elevated';
  return 'normal';
}

function _applyPolicyMitigation(mode, stability) {
  if (mode === 'elevated') {
    mitigationState.policyOverrides = {
      maxRetriesDelta: 1,
      backoffMultiplier: 1.5,
      jitterEnabled: true
    };
  } else if (mode === 'critical') {
    mitigationState.policyOverrides = {
      maxRetriesDelta: 2,
      backoffMultiplier: 2.0,
      jitterEnabled: true
    };
  } else {
    // mode normal - keep current if not recovering
  }
}

function _applyAgentMitigation(signals, decisions) {
  const agents = [...new Set(signals.map(s => s.agent))];
  
  for (const agent of agents) {
    const agentSignals = signals.filter(s => s.agent === agent).slice(-5);
    if (agentSignals.length < 3) continue;

    const avgDrift = agentSignals.reduce((sum, s) => sum + s.drift, 0) / agentSignals.length;
    
    if (avgDrift > 0.4) {
      mitigationState.agentOverrides[agent] = {
        safePromptMode: true,
        fallbackModel: 'gemini-1.5-flash',
        concurrencyLimitDelta: -1
      };
    } else if (avgDrift > 0.6) {
        mitigationState.agentOverrides[agent] = {
            safePromptMode: true,
            fallbackModel: 'gemini-1.5-flash',
            concurrencyLimitDelta: -3
        };
    }
  }
}

function _applyRecoveryLogic(stability) {
  if (stability.score > 85 && mitigationState.mode !== 'normal') {
    mitigationState.mode = 'normal';
    mitigationState.policyOverrides = {
      maxRetriesDelta: 0,
      backoffMultiplier: 1.0,
      jitterEnabled: false
    };
    mitigationState.agentOverrides = {};
  }
}
