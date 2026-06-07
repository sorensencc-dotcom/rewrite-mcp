/**
 * js/mas-predictive.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Predictive Mode — Cognitive Forecasting Engine.
 * Computes TTI, Agent Drift, and Recovery Forecasts using deterministic signal processing.
 */

const MASPredictive = (() => {
  'use strict';

  const TREND_WINDOW = 20; // Number of groups to analyze for trends
  const CRITICAL_FREQ_THRESHOLD = 50; // TTI target frequency (%)

  /**
   * Main entry point called by MASAnalytics or dashboard tick.
   * @param {Array} groups - Processed rerun groups from MASAnalytics.
   * @param {Object} currentStability - Current stability metrics.
   * @returns {Object} Forecast data.
   */
  function forecast(groups, currentStability) {
    if (!groups || groups.length < 5) {
      return {
        tti: 'Insufficient Data',
        nextAtRisk: 'N/A',
        recovery: { status: 'Stable', confidence: 100 },
        trends: { freq: 0, attempts: 0, backoff: 0 }
      };
    }

    const windowedGroups = groups.slice(-TREND_WINDOW);
    
    // 1. Compute Trends (Slopes)
    const freqTrend = _computeFrequencyTrend(groups); // Based on all groups to see slope
    const attemptsTrend = _computeSlope(windowedGroups.map((g, i) => ({ x: i, y: g.attemptCount })));
    const backoffTrend = _computeSlope(windowedGroups.map((g, i) => ({ x: i, y: g.totalBackoff })));

    // 2. TTI Solver
    const tti = _solveTTI(currentStability.rerunFreq, freqTrend);

    // 3. Agent Drift Forecast
    const nextAtRisk = _forecastAgentDrift(groups);

    // 4. Recovery Forecast
    const recovery = _forecastRecovery(groups, currentStability);

    return {
      tti,
      nextAtRisk,
      recovery,
      trends: {
        freq: freqTrend,
        attempts: attemptsTrend,
        backoff: backoffTrend
      }
    };
  }

  // ── Algorithms ─────────────────────────────────────────────────────

  /**
   * Computes the slope of rerun frequency over time.
   * We divide the groups into two halves of the TREND_WINDOW to see the delta.
   */
  function _computeFrequencyTrend(groups) {
    if (groups.length < 10) return 0;
    
    const half = Math.floor(TREND_WINDOW / 2);
    const recent = groups.slice(-half);
    const previous = groups.slice(-TREND_WINDOW, -half);
    
    if (previous.length === 0) return 0;

    // This is a simplification: delta of "density"
    // In a real system, we'd use time-buckets.
    const recentAvgAttempts = recent.reduce((sum, g) => sum + g.attemptCount, 0) / recent.length;
    const prevAvgAttempts = previous.reduce((sum, g) => sum + g.attemptCount, 0) / previous.length;
    
    return recentAvgAttempts - prevAvgAttempts;
  }

  /**
   * Simple linear regression slope: (N*Σxy - ΣxΣy) / (N*Σx^2 - (Σx)^2)
   */
  function _computeSlope(points) {
    const n = points.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denom;
  }

  /**
   * Solves for TTI (Time to Instability).
   * Logic: If currentFreq + (freqTrend * runs) >= CRITICAL_FREQ_THRESHOLD
   * Returns estimated minutes assuming 1 run per minute (configurable).
   */
  function _solveTTI(currentFreq, freqTrend) {
    if (freqTrend <= 0) return 'Stable (>60m)';
    
    const delta = CRITICAL_FREQ_THRESHOLD - currentFreq;
    if (delta <= 0) return 'IMMEDIATE';

    // Assume average 1 run per minute for TTI estimation
    const runsToThreshold = delta / freqTrend;
    const minutes = Math.round(runsToThreshold);
    
    if (minutes > 60) return 'Stable (>60m)';
    return `${minutes} minutes (projected)`;
  }

  /**
   * Identifies which agent is likely to degrade next.
   * Ranks by volatility and failure clustering.
   */
  function _forecastAgentDrift(groups) {
    const agents = [...new Set(groups.map(g => g.agent))];
    const scores = agents.map(agent => {
      const agentGroups = groups.filter(g => g.agent === agent).slice(-10);
      if (agentGroups.length < 3) return { agent, score: 0 };

      const volatility = _computeVolatility(agentGroups.map(g => g.attemptCount));
      const failureRate = agentGroups.filter(g => g.finalState === 'failed').length / agentGroups.length;
      const recentSeverity = agentGroups[agentGroups.length - 1].attemptCount;

      // Drift Score = Volatility * 2 + FailureRate * 5 + RecentSeverity
      const score = (volatility * 2) + (failureRate * 5) + recentSeverity;
      return { agent, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];
    
    if (!top || top.score < 2) return 'None (Normal)';
    
    const probability = Math.min(99, Math.round(top.score * 10));
    return `${top.agent} (${probability}% probability)`;
  }

  function _forecastRecovery(groups, stability) {
    const recent = groups.slice(-10);
    const successRate = recent.filter(g => g.finalState === 'success').length / recent.length;
    
    // Slope of attempts over last 10
    const slope = _computeSlope(recent.map((g, i) => ({ x: i, y: g.attemptCount })));
    
    let status = 'Stable';
    let confidence = 100;

    if (slope < -0.1) {
      status = 'Improving';
      confidence = Math.round(Math.abs(slope) * 200);
    } else if (slope > 0.1) {
      status = 'Degrading';
      confidence = Math.round(slope * 150);
    } else {
      status = successRate > 0.8 ? 'Stable' : 'Volatile';
      confidence = Math.round(successRate * 100);
    }

    return { 
      status, 
      confidence: Math.min(100, Math.max(0, confidence)) 
    };
  }

  function _computeVolatility(values) {
    if (values.length < 2) return 0;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((s, v) => s + v, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  return { forecast };
})();

window.MASPredictive = MASPredictive;
