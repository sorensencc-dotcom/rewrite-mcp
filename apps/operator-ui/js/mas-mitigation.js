/**
 * js/mas-mitigation.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Autonomous Mitigation Engine.
 * Evaluates analytics and forecasts to emit mitigation directives.
 * Driven by Phase 29 "Autonomous Mitigation Mode".
 */

const MASMitigation = (() => {
  'use strict';

  const MAX_DIRECTIVES = 50;

  const _state = {
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

    // Recent directives (ring buffer)
    recentDirectives: []
  };

  let _listeners = [];

  function init() {
    console.log('[MASMitigation] Initialized');
  }

  /**
   * Main entry point called by the analytics/dashboard tick.
   */
  function update(stability, forecast) {
    if (!stability || !forecast) return [];

    const timestamp = Date.now();
    const directives = [];

    // 1) Global mode evaluation
    const newMode = _evaluateGlobalMode(stability, forecast);
    if (newMode !== _state.mode) {
      _state.mode = newMode;
      // Note: We don't necessarily emit a directive just for mode change, 
      // but we could if we wanted a "system event".
    }

    // 2) Global policy mitigation
    const policyDirective = _maybeGeneratePolicyDirective(stability, forecast, newMode);
    if (policyDirective) directives.push(policyDirective);

    // 3) Agent-specific mitigation
    const agentDirectives = _maybeGenerateAgentDirectives(stability, forecast);
    directives.push(...agentDirectives);

    // 4) Recovery / de-escalation
    const recoveryDirectives = _maybeGenerateRecoveryDirectives(stability, forecast);
    directives.push(...recoveryDirectives);

    // 5) Apply directives to in-memory state
    _applyDirectivesToState(directives, timestamp);

    // 6) Store in recentDirectives ring buffer
    if (directives.length > 0) {
      _state.recentDirectives = [...directives, ..._state.recentDirectives].slice(0, MAX_DIRECTIVES);
    }

    _state.lastUpdatedAt = timestamp;

    // 7) Notify listeners
    if (directives.length > 0) {
      _listeners.forEach(cb => cb(directives));
    }

    // Update UI if panel exists
    if (window.MitigationPanel) {
      window.MitigationPanel.update(_state);
    }

    return directives;
  }

  function getState() {
    return JSON.parse(JSON.stringify(_state));
  }

  function onDirective(callback) {
    _listeners.push(callback);
  }

  // ── Logic ───────────────────────────────────────────────────────────

  function _evaluateGlobalMode(stability, forecast) {
    // forecast.tti looks like "10 minutes (projected)" or "Stable (>60m)"
    const ttiMinutes = _parseTTI(forecast.tti);
    const recoveryScore = stability.recoveryScore || 100; // Assuming we add this to stability or calc here
    
    // Calculate recovery score if not provided (same logic as analytics)
    const score = stability.recoveryScore || (100 
      - (stability.avgAttempts - 1) * 10 
      - (stability.avgBackoff / 1000) * 5 
      - (stability.failureRate * 40));

    if (score < 60 || ttiMinutes < 5) return 'critical';
    if (score < 75 || ttiMinutes < 15 || stability.rerunFreq > 20) return 'elevated';
    return 'normal';
  }

  function _maybeGeneratePolicyDirective(stability, forecast, mode) {
    if (mode === 'normal') {
        // If we were previously in elevated/critical, we'll let recovery logic handle it.
        return null;
    }

    const payload = {};
    if (mode === 'elevated') {
      payload.maxRetriesDelta = 1;
      payload.backoffMultiplier = 1.5;
      payload.jitterEnabled = true;
    } else if (mode === 'critical') {
      payload.maxRetriesDelta = 2;
      payload.backoffMultiplier = 2.0;
      payload.jitterEnabled = true;
    }

    // Only generate if different from current state to avoid spam
    if (payload.maxRetriesDelta === _state.policyOverrides.maxRetriesDelta &&
        payload.backoffMultiplier === _state.policyOverrides.backoffMultiplier) {
      return null;
    }

    return {
      id: _genId(),
      type: 'mitigate_policy',
      severity: mode === 'critical' ? 'critical' : 'warn',
      reason: `Global mode=${mode.toUpperCase()} (TTI=${forecast.tti})`,
      payload,
      createdAt: Date.now()
    };
  }

  function _maybeGenerateAgentDirectives(stability, forecast) {
    const directives = [];
    
    // forecast.nextAtRisk looks like "ENRICH (85% probability)"
    const riskMatch = forecast.nextAtRisk.match(/^([A-Z]+) \((\d+)% probability\)/);
    if (!riskMatch) return [];

    const agent = riskMatch[1];
    const probability = parseInt(riskMatch[2], 10);
    const riskScore = probability / 100;

    if (riskScore < 0.6) return [];

    const payload = {
      agent,
      safePromptMode: true,
      fallbackModel: 'gemini-1.5-flash', // Example stable fallback
      concurrencyLimitDelta: riskScore > 0.8 ? -3 : -1
    };

    // Check if we already have this override
    const current = _state.agentOverrides[agent];
    if (current && current.concurrencyLimitDelta === payload.concurrencyLimitDelta) {
        return [];
    }

    directives.push({
      id: _genId(),
      type: 'mitigate_agent',
      severity: riskScore > 0.8 ? 'critical' : 'warn',
      reason: `Agent ${agent} drift risk high (${probability}%)`,
      payload,
      createdAt: Date.now()
    });

    return directives;
  }

  function _maybeGenerateRecoveryDirectives(stability, forecast) {
    const score = stability.recoveryScore || (100 
        - (stability.avgAttempts - 1) * 10 
        - (stability.avgBackoff / 1000) * 5 
        - (stability.failureRate * 40));

    if (score > 85 && _state.mode !== 'normal') {
      return [{
        id: _genId(),
        type: 'mitigate_recover',
        severity: 'info',
        reason: `RecoveryScore=${Math.round(score)} > 85; System stabilized`,
        payload: {
          resetPolicyOverrides: true,
          clearAgentOverrides: true
        },
        createdAt: Date.now()
      }];
    }
    return [];
  }

  function _applyDirectivesToState(directives, timestamp) {
    for (const d of directives) {
      switch (d.type) {
        case 'mitigate_policy':
          Object.assign(_state.policyOverrides, d.payload);
          break;
        case 'mitigate_agent': {
          const { agent, ...rest } = d.payload;
          _state.agentOverrides[agent] = {
            ...(_state.agentOverrides[agent] || {}),
            ...rest
          };
          break;
        }
        case 'mitigate_recover':
          if (d.payload.resetPolicyOverrides) {
            _state.policyOverrides = {
              maxRetriesDelta: 0,
              backoffMultiplier: 1.0,
              jitterEnabled: false
            };
          }
          if (d.payload.clearAgentOverrides) {
            _state.agentOverrides = {};
          }
          _state.mode = 'normal';
          break;
      }
    }
  }

  function _parseTTI(ttiStr) {
    if (ttiStr === 'IMMEDIATE') return 0;
    const match = ttiStr.match(/(\d+) minutes/);
    return match ? parseInt(match[1], 10) : 999;
  }

  function _genId() {
    return Math.random().toString(36).substr(2, 9);
  }

  return { init, update, getState, onDirective };
})();

window.MASMitigation = MASMitigation;
