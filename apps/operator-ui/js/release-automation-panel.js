/**
 * js/release-automation-panel.js
 * @version 1.0.0
 * @date 2026-05-22
 *
 * Release Automation HUD Panel.
 * Monitors the health and velocity of the release pipeline.
 */

const ReleaseAutomationPanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    update();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <section id="panel-release-automation" class="hud-panel">
        <h2>Release Automation</h2>

        <div class="release-automation-grid">
          <div class="metric">
            <label>Last Full Release</label>
            <span id="ra-last-release">—</span>
          </div>

          <div class="metric">
            <label>Version Sealed</label>
            <span id="ra-version">—</span>
          </div>

          <div class="metric">
            <label>Drift Check</label>
            <span id="ra-drift">—</span>
          </div>

          <div class="metric">
            <label>Docs Sync</label>
            <span id="ra-docs">—</span>
          </div>

          <div class="metric">
            <label>Cloudflare Deploy</label>
            <span id="ra-deploy">—</span>
          </div>

          <div class="metric">
            <label>Velocity Delta</label>
            <span id="ra-velocity">—</span>
          </div>
        </div>
      </section>

      <style>
        .hud-panel {
          background: #0b0e14;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .hud-panel h2 {
          font-size: 14px;
          margin-top: 0;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #58a6ff;
        }
        .release-automation-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 10px;
        }
        .release-automation-grid .metric {
          background: #161b22;
          padding: 12px;
          border: 1px solid #30363d;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .release-automation-grid label {
          display: block;
          font-size: 10px;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .release-automation-grid span {
          font-family: 'SFMono-Regular', Consolas, monospace;
          font-size: 13px;
          color: #3fb950;
        }
        .metric-fail { color: #f85149 !important; }
        .metric-warn { color: #d29922 !important; }
      </style>
    `;
  }

  async function update() {
    const url = '/docs/releases/release-telemetry.json';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Telemetry not found');
      const data = await res.json();

      if (!data.length) return;
      const latest = data[data.length - 1];

      _set('ra-last-release', latest.timestamp.split('T')[0]);
      _set('ra-version', latest.version);
      
      _setStatus('ra-drift', latest.drift_passed ? 'PASS' : 'FAIL');
      _setStatus('ra-docs', latest.docs_synced ? 'OK' : 'ERROR');
      _setStatus('ra-deploy', latest.cloudflare_deploy ? 'OK' : 'ERROR');

      const vel = latest.velocity_delta;
      _set('ra-velocity', vel > 0 ? `+${vel}` : vel);

    } catch (err) {
      console.warn('[ReleaseAutomation] Telemetry fetch failed (likely first run):', err.message);
    }
  }

  function _set(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _setStatus(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.className = '';
    if (value === 'FAIL' || value === 'ERROR') el.classList.add('metric-fail');
    else if (value === 'WARN') el.classList.add('metric-warn');
  }

  return { init, update };
})();

window.ReleaseAutomationPanel = ReleaseAutomationPanel;
