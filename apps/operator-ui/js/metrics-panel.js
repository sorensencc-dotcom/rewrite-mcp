/**
 * js/metrics-panel.js
 * @version 2.1.0
 * @date 2026-05-17
 *
 * LLM metrics + Qdrant stats panel.
 * Skeleton loaders on load; error banner with retry on failure.
 */

const MetricsPanel = (() => {
  'use strict';

  let _root;

  // ── Public ──────────────────────────────────────────────────────────

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();
    _root.querySelector('#metrics-refresh').addEventListener('click', refresh);
    refresh();
  }

  async function refresh() {
    _showSkeleton();
    try {
      const metrics = await CicAPI.getMetrics();
      _clearError();
      _renderMetrics(metrics);
    } catch (err) {
      _showError(err.message, refresh);
      _clearSkeleton();
    }
  }

  // ── HTML shell ──────────────────────────────────────────────────────

  function _html() {
    return `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Metrics</span>
          <div class="panel-actions">
            <button id="metrics-refresh">↻ Refresh</button>
          </div>
        </div>
        <div class="panel-body">
          <div id="metrics-error"></div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Prompt Tokens</div>
              <div class="metric-value" id="mv-tokens-prompt">—</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Completion Tokens</div>
              <div class="metric-value" id="mv-tokens-completion">—</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Cache Hits</div>
              <div class="metric-value" id="mv-cache-hits">—</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Calls</div>
              <div class="metric-value" id="mv-total-calls">—</div>
            </div>
          </div>
          <div class="panel-section">
            <div class="section-title">Qdrant — cic_context</div>
            <div id="qdrant-stats">
              ${_skeletonLines(3)}
            </div>
          </div>
          <div class="panel-section">
            <div class="section-title">Recent LLM Calls</div>
            <div id="llm-calls-table">
              ${_skeletonRows(5)}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── Render ──────────────────────────────────────────────────────────

  function _renderMetrics(m) {
    _set('mv-tokens-prompt',     fmt(m.tokens_prompt_total));
    _set('mv-tokens-completion', fmt(m.tokens_completion_total));
    _set('mv-total-calls',       fmt(m.total_calls));

    const hits  = m.cache_hits ?? 0;
    const total = m.total_calls ?? 0;
    const pct   = total > 0 ? Math.round((hits / total) * 100) : 0;
    _set('mv-cache-hits', total > 0 ? `${hits} / ${total} (${pct}%)` : '—');

    // Qdrant
    const qdEl = document.getElementById('qdrant-stats');
    if (m.qdrant) {
      qdEl.innerHTML = `
        <table>
          <tbody>
            <tr><td class="text-muted">Collection</td><td class="mono">cic_context</td></tr>
            <tr><td class="text-muted">Vectors</td>   <td class="mono">${fmt(m.qdrant.points_count)}</td></tr>
            <tr><td class="text-muted">Status</td>    <td>${_qdrantBadge(m.qdrant.status)}</td></tr>
            <tr><td class="text-muted">Last update</td><td class="mono">${m.qdrant.last_update ?? '—'}</td></tr>
          </tbody>
        </table>`;
    } else {
      qdEl.innerHTML = `<div class="empty-state">Qdrant stats unavailable</div>`;
    }

    // LLM calls
    const callsEl = document.getElementById('llm-calls-table');
    const calls = m.recent_calls ?? [];
    if (!calls.length) {
      callsEl.innerHTML = `<div class="empty-state">No calls recorded</div>`;
      return;
    }
    callsEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Correlation</th><th>Intent</th><th>Strategy</th>
            <th>Prompt T</th><th>Comp T</th><th>Cache</th>
          </tr>
        </thead>
        <tbody>
          ${calls.map(c => `<tr>
            <td class="mono">${esc((c.correlation_id ?? c.id ?? '').slice(0, 8))}</td>
            <td>${esc(c.intent)}</td>
            <td>${esc(c.strategy)}</td>
            <td class="mono">${c.tokens_prompt ?? '—'}</td>
            <td class="mono">${c.tokens_completion ?? '—'}</td>
            <td>${c.cache_hit ? '✓' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // ── Error / Skeleton ────────────────────────────────────────────────

  function _showError(msg, retryFn) {
    const el = document.getElementById('metrics-error');
    if (!el) return;
    el.innerHTML = `
      <div class="error-banner">
        <span class="error-banner-msg">⚠ ${esc(msg)}</span>
        <button onclick="MetricsPanel.refresh()">Retry</button>
      </div>`;
  }

  function _clearError() {
    const el = document.getElementById('metrics-error');
    if (el) el.innerHTML = '';
  }

  function _showSkeleton() {
    const qdEl = document.getElementById('qdrant-stats');
    const llmEl = document.getElementById('llm-calls-table');
    if (qdEl)  qdEl.innerHTML  = _skeletonLines(3);
    if (llmEl) llmEl.innerHTML = _skeletonRows(5);
  }

  function _clearSkeleton() {
    const qdEl = document.getElementById('qdrant-stats');
    const llmEl = document.getElementById('llm-calls-table');
    if (qdEl)  qdEl.innerHTML  = '<div class="empty-state">—</div>';
    if (llmEl) llmEl.innerHTML = '<div class="empty-state">—</div>';
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  function _skeletonLines(n) {
    const widths = ['w-full', 'w-3-4', 'w-1-2', 'w-1-3', 'w-full'];
    return Array.from({ length: n }, (_, i) =>
      `<div class="skeleton skeleton-line ${widths[i % widths.length]}"></div>`
    ).join('');
  }

  function _skeletonRows(n) {
    return Array.from({ length: n }, () =>
      `<div class="skeleton skeleton-row"></div>`
    ).join('');
  }

  function _qdrantBadge(status) {
    if (status === 'green') return `<span style="color:var(--green)">● online</span>`;
    if (status === 'red')   return `<span style="color:var(--red)">● offline</span>`;
    return '—';
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { mount, refresh };
})();

window.MetricsPanel = MetricsPanel;
