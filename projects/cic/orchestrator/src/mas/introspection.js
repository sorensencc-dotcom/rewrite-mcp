// filename: introspection.js
// semver: 1.0.0
// date: 2026-05-21
// MAS Phase 30 — Deep Introspection Layer

import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const INTROSPECTION_PATH = resolve(process.cwd(), 'data/mas-introspection.json');

/**
 * MAS Introspection Store
 */
let introspectionLog = [];
const MAX_LOG_SIZE = 500; // Increased for Efficacy Lab

// Load persisted log if exists
if (existsSync(INTROSPECTION_PATH)) {
  try {
    const raw = readFileSync(INTROSPECTION_PATH, 'utf8');
    introspectionLog = JSON.parse(raw) || [];
  } catch {
    introspectionLog = [];
  }
}

/**
 * Records a cognitive introspection trace.
 */
export function recordIntrospection(record) {
  const entry = {
    id: _genId(),
    timestamp: Date.now(),
    ...record
  };

  introspectionLog.unshift(entry);
  if (introspectionLog.length > MAX_LOG_SIZE) {
    introspectionLog.pop();
  }

  _persist();
  return entry;
}

function _persist() {
  try {
    writeFileSync(INTROSPECTION_PATH, JSON.stringify(introspectionLog, null, 2));
  } catch (err) {
    console.error('[Introspection] Persistence failed:', err.message);
  }
}

/**
 * Returns recent introspection records.
 */
export function getIntrospectionLog() {
  return introspectionLog;
}

/**
 * Generates a counterfactual simulation based on current stability.
 * @param {Object} stability - Current stability metrics.
 * @param {Object} mitigation - The chosen mitigation.
 */
export function simulateCounterfactual(stability, mitigation) {
  // Simple deterministic simulation
  // Without mitigation, we assume stability continues to degrade at its current slope.
  const noMitigation = {
    projectedTTI: Math.max(0, (stability.score / 10) - 2),
    projectedFailures: Math.ceil(stability.rerunFreq * 1.5)
  };

  const withMitigation = {
    projectedTTI: Math.min(60, (stability.score / 5) + 10),
    projectedFailures: Math.ceil(stability.rerunFreq * 0.5)
  };

  return { noMitigation, withMitigation };
}

/**
 * Calculates a confidence score for a mitigation decision.
 */
export function calculateConfidence(stability, featureAttribution) {
  // Confidence = Base (0.7) + (Stability Consistency) - (Volatility Penalty)
  let confidence = 0.7;

  // Penalty for high drift volatility
  if (stability.avgDrift > 0.5) confidence -= 0.1;
  
  // Bonus for strong feature attribution (clear signal)
  const maxImpact = Math.max(...Object.values(featureAttribution));
  if (maxImpact > 0.6) confidence += 0.15;

  return Math.max(0.1, Math.min(0.99, confidence));
}

function _genId() {
  return createHash('sha256')
    .update(Math.random().toString() + Date.now())
    .digest('hex')
    .slice(0, 12);
}
