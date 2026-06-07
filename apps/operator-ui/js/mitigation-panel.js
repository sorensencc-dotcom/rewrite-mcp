/**
 * js/mitigation-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Autonomous Mitigation Dashboard Panel.
 * Renders active mitigation mode, policy overrides, and directives.
 */

const MitigationPanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <div class="mas-header">
        <h2>MAS Autonomous Mitigation</h2>
        <div class="mas-stat">
            <span class="mas-stat-label" style="font-size:10px;">Self-Correction Engine</span>
            <span id="mitigation-active-mode" class="mode-tag mode-normal">NORMAL</span>
        </div>
      </div>

      <div class="mitigation-grid">
        <div class="mitigation-section">
          <h3>Current Policy Overrides</h3>
          <div id="policy-overrides-list" class="override-list">
            <div class="empty-msg">No active overrides</div>
          </div>
        </div>

        <div class="mitigation-section">
          <h3>Agent-Specific Adjustments</h3>
          <div id="agent-overrides-list" class="override-list">
            <div class="empty-msg">No active adjustments</div>
          </div>
        </div>
      </div>

      <div class="mitigation-directives">
        <h3>Mitigation Directive Log</h3>
        <div id="mitigation-directives-log" class="directives-log">
          <!-- Directives will be prepended here -->
        </div>
      </div>

      <style>
        .mode-tag {
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 10px;
          margin-left: 8px;
          border: 1px solid transparent;
        }
        .mode-normal { background: rgba(63, 185, 80, 0.1); color: #3fb950; border-color: rgba(63, 185, 80, 0.3); }
        .mode-elevated { background: rgba(210, 153, 34, 0.1); color: #d29922; border-color: rgba(210, 153, 34, 0.3); animation: pulse-warn 2s infinite; }
        .mode-critical { background: rgba(248, 81, 73, 0.1); color: #f85149; border-color: rgba(248, 81, 73, 0.3); animation: pulse-crit 1s infinite; }

        @keyframes pulse-warn { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes pulse-crit { 0% { box-shadow: 0 0 0px #f85149; } 50% { box-shadow: 0 0 10px #f85149; } 100% { box-shadow: 0 0 0px #f85149; } }

        .mitigation-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .mitigation-section h3 {
          font-size: 10px;
          color: #8b949e;
          text-transform: uppercase;
          margin-bottom: 8px;
          border-bottom: 1px solid #30363d;
          padding-bottom: 4px;
        }
        .override-list {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #c9d1d9;
        }
        .override-item {
          padding: 4px 8px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 4px;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
        }
        .override-key { color: #8b949e; }
        .override-val { color: var(--accent); font-weight: 600; }

        .directives-log {
          height: 120px;
          overflow-y: auto;
          background: #0b0e14;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
        }
        .directive-entry {
          padding: 4px 0;
          border-bottom: 1px solid rgba(48, 54, 61, 0.5);
          display: flex;
          gap: 12px;
        }
        .directive-ts { color: #484f58; min-width: 60px; }
        .directive-type { min-width: 100px; font-weight: 800; }
        .directive-msg { color: #c9d1d9; flex-grow: 1; }
        
        .type-policy { color: #d29922; }
        .type-agent { color: #f85149; }
        .type-recover { color: #3fb950; }
        
        .empty-msg {
          color: #484f58;
          font-style: italic;
          padding: 8px;
        }
      </style>
    `;
  }

  function update(state) {
    if (!_container) return;

    _updateMode(state.mode);
    _updatePolicyOverrides(state.policyOverrides);
    _updateAgentOverrides(state.agentOverrides);
    _updateDirectives(state.recentDirectives);
  }

  function _updateMode(mode) {
    const el = document.getElementById('mitigation-active-mode');
    el.textContent = mode.toUpperCase();
    el.className = `mode-tag mode-${mode}`;
  }

  function _updatePolicyOverrides(p) {
    const container = document.getElementById('policy-overrides-list');
    const items = [];
    
    if (p.maxRetriesDelta !== 0) items.push(`<div class="override-item"><span class="override-key">Max Retries Δ</span><span class="override-val">+${p.maxRetriesDelta}</span></div>`);
    if (p.backoffMultiplier !== 1.0) items.push(`<div class="override-item"><span class="override-key">Backoff Multi</span><span class="override-val">${p.backoffMultiplier}x</span></div>`);
    if (p.jitterEnabled) items.push(`<div class="override-item"><span class="override-key">Jitter</span><span class="override-val">ENABLED</span></div>`);

    container.innerHTML = items.length ? items.join('') : '<div class="empty-msg">No active overrides</div>';
  }

  function _updateAgentOverrides(agents) {
    const container = document.getElementById('agent-overrides-list');
    const items = [];

    Object.entries(agents).forEach(([agent, cfg]) => {
      let details = [];
      if (cfg.safePromptMode) details.push('SafePrompt');
      if (cfg.fallbackModel) details.push('FallbackModel');
      if (cfg.concurrencyLimitDelta) details.push(`Limit Δ${cfg.concurrencyLimitDelta}`);
      
      items.push(`
        <div class="override-item" style="border-left: 3px solid #f85149;">
          <span class="override-key">${agent}</span>
          <span class="override-val" style="font-size:9px;">${details.join(' | ')}</span>
        </div>
      `);
    });

    container.innerHTML = items.length ? items.join('') : '<div class="empty-msg">No active adjustments</div>';
  }

  function _updateDirectives(directives) {
    const container = document.getElementById('mitigation-directives-log');
    
    // We only want to prepend NEW directives. 
    // For simplicity in this dashboard, we just re-render the last 20.
    const html = directives.slice(0, 20).map(d => {
      const ts = new Date(d.createdAt).toLocaleTimeString([], { hour12: false });
      const typeCls = d.type.replace('mitigate_', 'type-');
      return `
        <div class="directive-entry">
          <span class="directive-ts">[${ts}]</span>
          <span class="directive-type ${typeCls}">${d.type.toUpperCase()}</span>
          <span class="directive-msg">${d.reason}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<div class="empty-msg">No directives emitted</div>';
  }

  return { init, update };
})();

window.MitigationPanel = MitigationPanel;
