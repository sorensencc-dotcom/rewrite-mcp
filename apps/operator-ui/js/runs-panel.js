/**
 * js/runs-panel.js
 * @version 2.1.0
 * @date 2026-05-17
 *
 * Recent pipeline runs panel.
 * Skeleton on load, error banner with retry, auto-poll every 20s.
 */

const RunsPanel = (() => {
  'use strict';

  let _root;
  let _pollTimer = null;

  // ── Public ──────────────────────────────────────────────────────────

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();
    _root.querySelector('#runs-refresh').addEventListener('click', refresh);
    refresh();
    _startPoller();
  }

  async function refresh() {
    _showSkeleton();
    try {
      const { runs = [] } = await CicAPI.listRuns();
      _clearError();
      _renderRuns(runs);
    } catch (err) {
      _showError(err.message);
    }
  }

  // ── HTML shell ──────────────────────────────────────────────────────

  function _html() {
    return `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Recent Runs</span>
          <div class="panel-actions">
            <button id="runs-refresh">↻ Refresh</button>
          </div>
        </div>
        <div class="panel-body">
          <div id="runs-error"></div>
          <div id="runs-table">${_skeletonRows(6)}</div>
        </div>
      </div>`;
  }

  // ── Render ──────────────────────────────────────────────────────────

  function _renderRuns(runs) {
    const el = document.getElementById('runs-table');
    if (!el) return;

    if (!runs.length) {
      el.innerHTML = `<div class="empty-state">No runs yet</div>`;
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Intent</th><th>Strategy</th>
            <th>Tokens</th><th>ms</th><th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${runs.map(r => `<tr>
            <td class="mono">${esc(r.correlation_id?.slice(0, 8) ?? r.id ?? '—')}</td>
            <td>${esc(r.intent)}</td>
            <td>${esc(r.strategy)}</td>
            <td class="mono">${((r.tokens_prompt ?? 0) + (r.tokens_completion ?? 0)).toLocaleString()}</td>
            <td class="mono">${r.duration_ms != null ? r.duration_ms : '—'}</td>
            <td class="mono" style="color:var(--text-muted)">${r.ts ? _relTime(r.ts) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // ── Error / Skeleton ────────────────────────────────────────────────

  function _showError(msg) {
    const errEl = document.getElementById('runs-error');
    if (errEl) errEl.innerHTML = `
      <div class="error-banner">
        <span class="error-banner-msg">⚠ ${esc(msg)}</span>
        <button onclick="RunsPanel.refresh()">Retry</button>
      </div>`;
    const tbl = document.getElementById('runs-table');
    if (tbl) tbl.innerHTML = '';
  }

  function _clearError() {
    const errEl = document.getElementById('runs-error');
    if (errEl) errEl.innerHTML = '';
  }

  function _showSkeleton() {
    const el = document.getElementById('runs-table');
    if (el) el.innerHTML = _skeletonRows(6);
  }

  function _skeletonRows(n) {
    return Array.from({ length: n }, () =>
      `<div class="skeleton skeleton-row"></div>`
    ).join('');
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  function _startPoller() {
    _pollTimer = setInterval(refresh, 20_000);
  }

  function _relTime(ts) {
    const diffMs = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { mount, refresh };
})();

window.RunsPanel = RunsPanel;
