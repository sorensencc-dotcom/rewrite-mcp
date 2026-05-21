/**
 * js/telemetry-panel.js
 * @version 1.0.0
 * @date 2026-05-18
 *
 * Prompt Telemetry panel for the CIC Control Room.
 * Monitors pack usage, drift, and model call performance.
 */

const TelemetryPanel = (() => {
  'use strict';

  let _root;
  let _pollInterval;

  // ── Public ──────────────────────────────────────────────────────────

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();
    _root.querySelector('#telemetry-refresh').addEventListener('click', refresh);
    refresh();
    
    // Auto-refresh every 10 seconds while mounted
    _pollInterval = setInterval(refresh, 10000);
  }

  function unmount() {
    if (_pollInterval) clearInterval(_pollInterval);
  }

  async function refresh() {
    _showSkeleton();
    try {
      const [packs, drift, modelCalls, pipelines] = await Promise.all([
        CicAPI.getTelemetryPacks(),
        CicAPI.getTelemetryDrift(),
        CicAPI.getTelemetryModelCalls(),
        CicAPI.getTelemetryPipelines()
      ]);
      
      _clearError();
      _renderPacks(packs);
      _renderDrift(drift);
      _renderModelCalls(modelCalls);
      _renderPipelines(pipelines);
    } catch (err) {
      _showError(err.message);
    }
  }

  // ── HTML shell ──────────────────────────────────────────────────────

  function _html() {
    return `
      <section class="panel panel-subsystem">
        <header class="panel-header">
          <div class="panel-title-row">
            <h2 class="panel-title">Prompt Telemetry</h2>
            <span class="panel-tag">Usage • Drift • Performance</span>
          </div>
          <div class="panel-actions">
            <button id="telemetry-refresh" class="btn btn-ghost">↻ Refresh</button>
          </div>
        </header>

        <div class="panel-body">
          <div id="telemetry-error"></div>
          
          <div class="panel-section">
            <div class="section-title">Pack Usage</div>
            <div id="telemetry-packs" class="metrics-grid">
              ${_skeletonCards(2)}
            </div>
          </div>

          <div class="metrics-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="panel-section">
              <div class="section-title">Drift Events</div>
              <div id="telemetry-drift">
                ${_skeletonRows(3)}
              </div>
            </div>
            <div class="panel-section">
              <div class="section-title">Recent Pipelines</div>
              <div id="telemetry-pipelines">
                ${_skeletonRows(3)}
              </div>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">Model Call Performance</div>
            <div id="telemetry-model-calls">
              ${_skeletonRows(5)}
            </div>
          </div>
        </div>
      </section>`;
  }

  // ── Renderers ───────────────────────────────────────────────────────

  function _renderPacks(packs) {
    const el = document.getElementById('telemetry-packs');
    const entries = Object.entries(packs || {}).sort((a, b) => b[1].count - a[1].count);
    
    if (!entries.length) {
      el.innerHTML = `<div class="empty-state">No pack usage recorded</div>`;
      return;
    }

    el.innerHTML = entries.map(([name, info]) => `
      <div class="metric-card">
        <div class="metric-label">${esc(name)} <span class="header-phase">v${info.version}</span></div>
        <div class="metric-value">${info.count.toLocaleString()} <small style="font-size:10px; opacity:0.5">calls</small></div>
      </div>
    `).join('');
  }

  function _renderDrift(drift) {
    const el = document.getElementById('telemetry-drift');
    const data = drift || [];
    
    if (!data.length) {
      el.innerHTML = `<div class="empty-state">No drift events</div>`;
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Pack</th><th>Subsystem</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${data.slice(0, 5).map(d => `
            <tr>
              <td class="mono">${esc(d.pack)}</td>
              <td>${esc(d.subsystem)}</td>
              <td>${d.expectedHash === d.actualHash ? '<span class="badge ok">Safe</span>' : '<span class="badge error">DRIFT</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  function _renderPipelines(pipelines) {
    const el = document.getElementById('telemetry-pipelines');
    const data = pipelines || [];

    if (!data.length) {
      el.innerHTML = `<div class="empty-state">No pipeline events</div>`;
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr><th>ID</th><th>Steps</th></tr>
        </thead>
        <tbody>
          ${data.slice(0, 5).map(p => `
            <tr>
              <td class="mono">${esc((p.jobId || '').slice(0, 8))}</td>
              <td><span class="header-phase">${(p.pipeline || []).length} steps</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  function _renderModelCalls(calls) {
    const el = document.getElementById('telemetry-model-calls');
    const data = calls || [];

    if (!data.length) {
      el.innerHTML = `<div class="empty-state">No model calls recorded</div>`;
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Model</th><th>Subsystem</th><th>Latency</th><th>Status</th><th>Pack</th>
          </tr>
        </thead>
        <tbody>
          ${data.slice(0, 10).map(c => `
            <tr>
              <td>${esc(c.model)}</td>
              <td>${esc(c.subsystem)}</td>
              <td class="mono">${c.latencyMs}ms</td>
              <td>${c.success ? '<span class="badge ok">OK</span>' : '<span class="badge error">Fail</span>'}</td>
              <td class="mono">${esc(c.pack || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // ── Error / Skeleton ────────────────────────────────────────────────

  function _showError(msg) {
    const el = document.getElementById('telemetry-error');
    if (el) {
      el.innerHTML = `
        <div class="error-banner">
          <span class="error-banner-msg">Telemetry error: ${esc(msg)}</span>
          <button class="btn btn-secondary" onclick="TelemetryPanel.refresh()">Retry</button>
        </div>`;
    }
  }

  function _clearError() {
    const el = document.getElementById('telemetry-error');
    if (el) el.innerHTML = '';
  }

  function _showSkeleton() {
    // We only show skeleton on first load if needed, or keeping it simple for now
  }

  function _skeletonCards(n) {
    return Array.from({ length: n }, () => `<div class="skeleton skeleton-card"></div>`).join('');
  }

  function _skeletonRows(n) {
    return Array.from({ length: n }, () => `<div class="skeleton skeleton-row"></div>`).join('');
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { mount, unmount, refresh };
})();

window.TelemetryPanel = TelemetryPanel;
