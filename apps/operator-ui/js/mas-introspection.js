/**
 * js/mas-introspection.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Deep Introspection Engine (Client-Side).
 * Captures the 'why' behind autonomous interventions.
 */

const MASIntrospection = (() => {
  'use strict';

  const MAX_RECORDS = 50;
  let _records = [];

  function init() {
    console.log('[MASIntrospection] Initialized');
  }

  /**
   * Main entry point called by the analytics/mitigation loop.
   */
  function trace(stability, forecast, mitigationState, directives) {
    if (!directives || directives.length === 0) return;

    const timestamp = Date.now();
    
    directives.forEach(d => {
      const record = {
        id: d.id,
        timestamp,
        type: d.type,
        reason: d.reason,
        modeBefore: mitigationState.mode, // Simplified trace
        modeAfter: mitigationState.mode, 
        confidence: _calculateConfidence(stability, d),
        featureAttribution: _getAttributeFeatures(stability, forecast, d),
        decisionPath: _getDecisionPath(d, mitigationState),
        counterfactuals: _simulateCounterfactual(stability, d)
      };

      _records.unshift(record);
    });

    if (_records.length > MAX_RECORDS) {
      _records = _records.slice(0, MAX_RECORDS);
    }

    // Update UI if panel exists
    if (window.IntrospectionPanel) {
      window.IntrospectionPanel.update(_records);
    }
  }

  function getRecords() {
    return [..._records];
  }

  // ── Logic ───────────────────────────────────────────────────────────

  function _calculateConfidence(stability, directive) {
    let base = 0.8;
    if (stability.rerunFreq > 20) base -= 0.1;
    if (stability.successRate < 80) base -= 0.1;
    return Math.max(0.4, Math.min(0.99, base));
  }

  function _getAttributeFeatures(stability, forecast, directive) {
    return {
      rerunFreq: { val: stability.rerunFreq, weight: 0.4 },
      recoveryScore: { val: stability.recoveryScore, weight: 0.3 },
      ttiMinutes: { val: _parseTTI(forecast.tti), weight: 0.2 },
      driftProbability: { val: _parseProbability(forecast.nextAtRisk), weight: 0.1 }
    };
  }

  function _getDecisionPath(directive, state) {
    const path = [];
    path.push(`Trigger: ${directive.type.toUpperCase()}`);
    path.push(`Reason: ${directive.reason}`);
    
    if (directive.type === 'mitigate_policy') {
      path.push(`Override: maxRetriesDelta=${directive.payload.maxRetriesDelta}`);
      path.push(`Override: backoffMultiplier=${directive.payload.backoffMultiplier}`);
    } else if (directive.type === 'mitigate_agent') {
      path.push(`Target: ${directive.payload.agent}`);
      path.push(`Strategy: SafePrompt + FallbackModel`);
    }

    return path;
  }

  function _simulateCounterfactual(stability, directive) {
    return {
      noMitigation: {
        projectedTTI: Math.max(1, _parseTTI(stability.recoveryScore < 70 ? '5 minutes' : '15 minutes')),
        projectedFailures: Math.ceil(stability.rerunFreq * 1.4)
      },
      withMitigation: {
        projectedTTI: 60,
        projectedFailures: Math.ceil(stability.rerunFreq * 0.4)
      }
    };
  }

  function _parseTTI(ttiStr) {
    if (ttiStr === 'IMMEDIATE') return 0;
    if (typeof ttiStr === 'number') return ttiStr;
    const match = String(ttiStr).match(/(\d+) minutes/);
    return match ? parseInt(match[1], 10) : 999;
  }

  function _parseProbability(str) {
    const match = String(str).match(/(\d+)%/);
    return match ? parseInt(match[1], 10) / 100 : 0;
  }

  return { init, trace, getRecords };
})();

window.MASIntrospection = MASIntrospection;
