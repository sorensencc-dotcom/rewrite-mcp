/**
 * js/mas-analytics.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Stability Metrics, Heatmap, and Recovery Score analytics.
 * Computes higher-order intelligence metrics from the timeline telemetry.
 */

const MASAnalytics = (() => {
  'use strict';

  const AGENTS = ['INGEST', 'ENRICH', 'ORCHESTRATE', 'SYNTHESIZE', 'AUDIT', 'MCP'];
  const DIRECTIVES = ['rerunAgent', 'speculativeRun', 'parallelizeAgents', 'skipAgent', 'fallbackAgent', 'none'];
  const MAX_HEATMAP_CELLS = 60;

  function init() {
    console.log('[MASAnalytics] Initialized');
  }

  let _lastGroups = [];
  let _lastStability = {};
  let _lastDecisions = [];

  /**
   * Main entry point called by the dashboard tick.
   */
  function update(timelineData) {
    if (!timelineData || timelineData.error || !timelineData.length) return;

    const { groups, allRunsCount, decisions } = _processTimeline(timelineData);
    _lastGroups = groups;
    _lastDecisions = decisions;
    
    const stability = _computeStability(groups, allRunsCount);
    _lastStability = stability;
    _renderStability(stability);

    const heatmapData = _computeHeatmapData(groups);
    _renderHeatmap(heatmapData);

    const routingHeatmap = _computeRoutingHeatmap(decisions);
    _renderRoutingHeatmap(routingHeatmap);

    const recoveryScore = _computeRecoveryScore(stability);
    stability.recoveryScore = recoveryScore; // Attach for mitigation engine
    _updateRecoveryScoreUI(recoveryScore);

    // If Predictive Mode is loaded, update it
    let forecast = null;
    if (window.MASPredictive) {
      forecast = window.MASPredictive.forecast(groups, stability);
    }

    if (window.PredictivePanel && forecast) {
      window.PredictivePanel.updateWithForecast(forecast);
    }

    // If Mitigation Mode is loaded, update it
    if (window.MASMitigation && forecast) {
      const directives = window.MASMitigation.update(stability, forecast);
      
      // Phase 30: Introspection Trace
      if (window.MASIntrospection && directives.length > 0) {
        window.MASIntrospection.trace(stability, forecast, window.MASMitigation.getState(), directives);
      }
      
      // Phase 31: Efficacy Lab
      if (window.EfficacyPanel && window.MASIntrospection) {
        window.EfficacyPanel.update(window.MASIntrospection.getRecords());
      }
    }
  }

  function getLastData() {
    return { groups: _lastGroups, stability: _lastStability };
  }

  // ── Logic ───────────────────────────────────────────────────────────

  function _processTimeline(data) {
    const groups = [];
    const decisions = [];
    let allRunsCount = 0;
    
    // Sort oldest to newest for grouping
    const sorted = [...data].sort((a, b) => new Date(a.ts) - new Date(b.ts));

    let i = 0;
    while (i < sorted.length) {
      const ev = sorted[i];
      
      if (ev.type === 'model_call') allRunsCount++;
      if (ev.type === 'mas_decision') decisions.push(ev);

      if (ev.type === 'mas_rerun_attempt') {
        const group = [ev];
        const cid = ev.correlationId;
        const agent = ev.agent;
        let j = i + 1;
        let finished = false;
        
        while (j < sorted.length) {
          const next = sorted[j];
          if (next.correlationId === cid && next.agent === agent) {
            if (next.type === 'mas_rerun_attempt' || next.type === 'mas_rerun_backoff') {
              group.push(next);
              j++;
            } else if (next.type === 'mas_rerun_final_state') {
              group.push(next);
              j++;
              finished = true;
              break;
            } else { break; }
          } else { break; }
        }
        
        if (finished || group.length > 1) {
          groups.push({
            agent,
            cid,
            events: group,
            attemptCount: group.filter(e => e.type === 'mas_rerun_attempt').length,
            totalBackoff: group.reduce((sum, e) => sum + (e.meta?.backoffMs || 0), 0),
            finalState: group.find(e => e.type === 'mas_rerun_final_state')?.meta?.state || 'incomplete',
            ts: ev.ts
          });
          i = j;
          continue;
        }
      }
      i++;
    }
    
    return { groups, allRunsCount, decisions };
  }

  function _computeStability(groups, allRunsCount) {
    const totalGroups = groups.length;
    if (totalGroups === 0) {
      return {
        rerunFreq: 0,
        avgAttempts: 1,
        avgBackoff: 0,
        successRate: 100,
        failureRate: 0,
        agents: {}
      };
    }

    const successfulGroups = groups.filter(g => g.finalState === 'success').length;
    const totalAttempts = groups.reduce((sum, g) => sum + g.attemptCount, 0);
    const totalBackoff = groups.reduce((sum, g) => sum + g.totalBackoff, 0);

    const stability = {
      rerunFreq: (totalGroups / (allRunsCount || 1)) * 100,
      avgAttempts: totalAttempts / totalGroups,
      avgBackoff: totalBackoff / totalGroups,
      successRate: (successfulGroups / totalGroups) * 100,
      failureRate: ((totalGroups - successfulGroups) / totalGroups),
      agents: {}
    };

    // Per-agent stability
    AGENTS.forEach(agent => {
      const agentGroups = groups.filter(g => g.agent === agent);
      if (agentGroups.length > 0) {
        const agentSuccess = agentGroups.filter(g => g.finalState === 'success').length;
        stability.agents[agent] = {
          count: agentGroups.length,
          avgAttempts: agentGroups.reduce((sum, g) => sum + g.attemptCount, 0) / agentGroups.length,
          successRate: (agentSuccess / agentGroups.length) * 100
        };
      }
    });

    return stability;
  }

  function _computeHeatmapData(groups) {
    // Map of Agent -> Array of severity scores (last N)
    const heatmap = {};
    AGENTS.forEach(a => heatmap[a] = new Array(MAX_HEATMAP_CELLS).fill(0));

    // For simplicity, we just use the last N groups. 
    // In a real heatmap we might bucket by time, but here we bucket by event sequence.
    groups.slice(-MAX_HEATMAP_CELLS).forEach((g, idx) => {
      if (!heatmap[g.agent]) return;
      
      let severity = (g.attemptCount - 1) + (g.totalBackoff / 1000);
      if (g.finalState === 'failed') severity += 2;
      
      // Clamp severity for the 0-4 scale
      const score = Math.min(4, Math.max(1, Math.ceil(severity)));
      const cellIdx = MAX_HEATMAP_CELLS - groups.length + idx; 
      if (cellIdx >= 0 && cellIdx < MAX_HEATMAP_CELLS) {
        heatmap[g.agent][cellIdx] = g.finalState === 'failed' ? 'fail' : score;
      }
    });

    return heatmap;
  }

  function _computeRoutingHeatmap(decisions) {
    // Matrix of Agent x Directive
    const matrix = {};
    AGENTS.forEach(a => {
      matrix[a] = {};
      DIRECTIVES.forEach(d => matrix[a][d] = 0);
    });

    decisions.forEach(d => {
      const agent = d.agent;
      const directive = d.directive || d.action || d.meta?.action;
      if (matrix[agent] && matrix[agent].hasOwnProperty(directive)) {
        matrix[agent][directive]++;
      }
    });

    return matrix;
  }

  function _computeRecoveryScore(s) {
    // RecoveryScore = 100 - (avg_attempts - 1) * 10 - (avg_backoff_ms / 1000) * 5 - (failure_rate * 40)
    let score = 100 
      - (s.avgAttempts - 1) * 10 
      - (s.avgBackoff / 1000) * 5 
      - (s.failureRate * 40);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Renderers ───────────────────────────────────────────────────────

  function _renderStability(s) {
    document.getElementById('metric-rerun-freq').textContent = s.rerunFreq.toFixed(1);
    document.getElementById('metric-avg-attempts').textContent = s.avgAttempts.toFixed(2);
    document.getElementById('metric-avg-backoff').textContent = Math.round(s.avgBackoff);
    document.getElementById('metric-success-rate').textContent = s.successRate.toFixed(1) + '%';

    const tableEl = document.getElementById('mas-agent-stability-table');
    const rows = Object.entries(s.agents).map(([agent, data]) => {
      return `[${agent}] count=${data.count} avg_attempts=${data.avgAttempts.toFixed(2)} success=${data.successRate.toFixed(1)}%`;
    });
    tableEl.innerHTML = rows.join('<br>');
  }

  function _renderHeatmap(data) {
    const container = document.getElementById('mas-heatmap-container');
    container.innerHTML = '';

    AGENTS.forEach(agent => {
      const row = document.createElement('div');
      row.className = 'heatmap-row';
      
      const label = document.createElement('div');
      label.className = 'heatmap-label';
      label.textContent = agent;
      
      const cellsWrap = document.createElement('div');
      cellsWrap.className = 'heatmap-cells';
      
      data[agent].forEach(val => {
        const cell = document.createElement('div');
        cell.className = `heatmap-cell severity-${val}`;
        cellsWrap.appendChild(cell);
      });
      
      row.appendChild(label);
      row.appendChild(cellsWrap);
      container.appendChild(row);
    });
  }

  function _renderRoutingHeatmap(matrix) {
    const container = document.getElementById('mas-routing-heatmap-container');
    if (!container) return;

    // Build ASCII-style table
    let table = 'AGENT       | RERUN | SPEC  | PARA  | SKIP  | FALL  | NONE\n';
    table += '------------|-------|-------|-------|-------|-------|------\n';

    AGENTS.forEach(agent => {
      const row = matrix[agent];
      const name = agent.padEnd(11);
      const rerun = row.rerunAgent.toString().padStart(5);
      const spec = row.speculativeRun.toString().padStart(5);
      const para = row.parallelizeAgents.toString().padStart(5);
      const skip = row.skipAgent.toString().padStart(5);
      const fall = row.fallbackAgent.toString().padStart(5);
      const none = row.none.toString().padStart(5);
      
      table += `${name} | ${rerun} | ${spec} | ${para} | ${skip} | ${fall} | ${none}\n`;
    });

    container.innerHTML = `<pre style="margin:0; color:var(--accent); font-size:10px;">${table}</pre>`;
  }

  function _updateRecoveryScoreUI(score) {
    const el = document.getElementById('recovery-score-value');
    if (!el) return;
    
    el.textContent = score;
    el.className = '';
    
    if (score >= 90) el.classList.add('score-excellent');
    else if (score >= 75) el.classList.add('score-stable');
    else if (score >= 60) el.classList.add('score-degrading');
    else el.classList.add('score-critical');
    
    const status = score >= 90 ? 'Excellent' : score >= 75 ? 'Stable' : score >= 60 ? 'Degrading' : 'Critical';
    el.textContent = `${score} (${status})`;
  }

  return { init, update, getLastData };
})();

window.MASAnalytics = MASAnalytics;
