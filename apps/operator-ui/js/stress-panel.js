/**
 * js/stress-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Concurrency Stress Harness Panel.
 * Visualizes stress runs and their outcomes using telemetry data.
 */

const StressPanel = (() => {
  'use strict';

  let _root;
  let _pollTimer = null;

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();
    _root.querySelector('#stress-refresh').addEventListener('click', refresh);
    refresh();
    _startPoller();
  }

  async function refresh() {
    _showSkeleton();
    try {
      const pipelines = await CicAPI.getTelemetryPipelines();
      // Filter for stress runs
      const stressRuns = (pipelines || []).filter(p => p.correlationId && p.correlationId.startsWith('stress-'));
      _render(stressRuns);
    } catch (err) {
      _showError(err.message);
    }
  }

  function _html() {
    return `
      <div class="panel panel-subsystem">
        <header class="panel-header">
          <div class="panel-title-row">
            <h2 class="panel-title">Stress Harness Runs</h2>
            <span class="panel-tag">Telemetry-Aware</span>
          </div>
          <div class="panel-actions">
            <button id="stress-refresh" class="btn btn-secondary">↻ Refresh</button>
          </div>
        </header>
        <div class="panel-body">
          <div id="stress-error"></div>
          <div id="stress-table">${_skeletonRows(4)}</div>
        </div>
      </div>`;
  }

  function _render(runs) {
    const el = document.getElementById('stress-table');
    if (!el) return;

    if (!runs.length) {
      el.innerHTML = `<div class="empty-state">No stress runs found in telemetry</div>`;
      return;
    }

    // Sort by timestamp descending
    runs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    el.innerHTML = `
      <table class="runs-table">
        <thead>
          <tr>
            <th>CorrelationID</th>
            <th>Packs</th>
            <th>Agents</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${runs.map(r => `
            <tr>
              <td class="mono">
                <a href="#" onclick="StressPanel.viewTrace('${r.correlationId}'); return false;">
                  ${r.correlationId.slice(0, 15)}...
                </a>
              </td>
              <td>${(r.packs || []).length}</td>
              <td>${(r.pipeline || []).join(', ')}</td>
              <td class="mono">${new Date(r.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div id="stress-waterfall" class="hidden">
        <header class="panel-header">
           <h3 class="panel-section-title">Waterfall Trace</h3>
           <button class="btn btn-ghost" onclick="document.getElementById('stress-waterfall').classList.add('hidden')">Close</button>
        </header>
        <div id="stress-waterfall-content"></div>
      </div>
    `;
  }

  async function viewTrace(correlationId) {
    const content = document.getElementById('stress-waterfall-content');
    const container = document.getElementById('stress-waterfall');
    container.classList.remove('hidden');
    content.innerHTML = '<div class="skeleton"></div>';

    try {
      const trace = await CicAPI._req('GET', `/telemetry/trace/${correlationId}`);
      if (window.WaterfallRenderer) {
        window.WaterfallRenderer.render(trace, content);
      } else {
        content.innerHTML = `<pre class="log">${JSON.stringify(trace, null, 2)}</pre>`;
      }
    } catch (err) {
      content.innerHTML = `<div class="error-banner">Failed to load trace: ${err.message}</div>`;
    }
  }

  function _showError(msg) {
    const errEl = document.getElementById('stress-error');
    if (errEl) errEl.innerHTML = `<div class="error-banner">⚠ ${msg}</div>`;
  }

  function _showSkeleton() {
    const el = document.getElementById('stress-table');
    if (el) el.innerHTML = _skeletonRows(4);
  }

  function _skeletonRows(n) {
    return Array.from({ length: n }, () => `<div class="skeleton skeleton-row"></div>`).join('');
  }

  function _startPoller() {
    _pollTimer = setInterval(refresh, 10_000);
  }

  return { mount, refresh, viewTrace };
})();

window.StressPanel = StressPanel;
