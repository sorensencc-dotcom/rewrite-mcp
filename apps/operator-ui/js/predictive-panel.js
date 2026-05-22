/**
 * js/predictive-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Predictive Mode Dashboard Panel.
 * Renders forecasts for TTI, Agent Drift, and Recovery.
 */

const PredictivePanel = (() => {
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
        <h2>MAS Predictive Mode</h2>
        <div class="mas-stat"><span class="mas-stat-label" style="font-size:10px;">Cognitive Forecasting</span></div>
      </div>
      <div class="mas-analytics-grid predictive-grid">
        <div class="mas-analytics-card predictive-card">
          <div class="mas-analytics-value" id="pred-tti">--</div>
          <div class="mas-analytics-label">Time-to-Instability (TTI)</div>
        </div>
        <div class="mas-analytics-card predictive-card">
          <div class="mas-analytics-value" id="pred-risk-agent">--</div>
          <div class="mas-analytics-label">Next At-Risk Agent</div>
        </div>
        <div class="mas-analytics-card predictive-card">
          <div class="mas-analytics-value" id="pred-recovery">--</div>
          <div class="mas-analytics-label">Recovery Forecast</div>
        </div>
      </div>
      
      <div class="predictive-trends">
        <div class="trend-item">
          <span class="trend-label">Rerun Freq Trend:</span>
          <span id="trend-freq" class="trend-val">--</span>
        </div>
        <div class="trend-item">
          <span class="trend-label">Attempt Volatility:</span>
          <span id="trend-attempts" class="trend-val">--</span>
        </div>
        <div class="trend-item">
          <span class="trend-label">Backoff Trajectory:</span>
          <span id="trend-backoff" class="trend-val">--</span>
        </div>
      </div>

      <style>
        .predictive-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .predictive-card {
          background: #0d1117;
          border: 1px solid var(--border);
          border-left: 4px solid var(--accent);
          border-radius: 6px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .predictive-card .mas-analytics-value {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 18px;
          margin-bottom: 4px;
          text-shadow: 0 0 10px rgba(88, 166, 255, 0.3);
        }
        .predictive-card .mas-analytics-label {
          color: #8b949e;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .predictive-trends {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-family: 'SFMono-Regular', Consolas, monospace;
          font-size: 11px;
          background: #0b0e14;
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .trend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trend-label {
          color: #8b949e;
          text-transform: uppercase;
          font-size: 9px;
        }
        .trend-val {
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.03);
        }
        .trend-up { color: #ff7b72; background: rgba(248, 81, 73, 0.1); }
        .trend-down { color: #3fb950; background: rgba(63, 185, 80, 0.1); }
        .trend-stable { color: #8b949e; }
      </style>
    `;
  }

  function update(groups, stability) {
    if (!_container) return;

    const forecast = MASPredictive.forecast(groups, stability);
    
    _updateUI(forecast);
  }

  function _updateUI(f) {
    document.getElementById('pred-tti').textContent = f.tti;
    document.getElementById('pred-risk-agent').textContent = f.nextAtRisk;
    
    const recEl = document.getElementById('pred-recovery');
    recEl.textContent = `${f.recovery.status} (${f.recovery.confidence}%)`;
    
    // Colorize recovery
    recEl.className = 'mas-analytics-value';
    if (f.recovery.status === 'Stable' || f.recovery.status === 'Improving') recEl.style.color = 'var(--online)';
    else if (f.recovery.status === 'Degrading') recEl.style.color = 'var(--degraded)';
    else recEl.style.color = 'var(--down)';

    _renderTrend('trend-freq', f.trends.freq, '%');
    _renderTrend('trend-attempts', f.trends.attempts, ' pts');
    _renderTrend('trend-backoff', f.trends.backoff / 1000, 's');
  }

  function _renderTrend(id, val, unit) {
    const el = document.getElementById(id);
    const sign = val > 0 ? '↑' : val < 0 ? '↓' : '→';
    const cls = val > 0.05 ? 'trend-up' : val < -0.05 ? 'trend-down' : 'trend-stable';
    
    el.textContent = `${sign} ${Math.abs(val).toFixed(2)}${unit}`;
    el.className = `trend-val ${cls}`;
  }

  return { init, update };
})();

window.PredictivePanel = PredictivePanel;
