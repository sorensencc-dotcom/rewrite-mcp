/**
 * js/agents-panel.js
 * @version 2.1.0
 * @date 2026-05-17
 *
 * Agent status panel — shows registered agents and their health.
 * Skeleton on load, error banner with retry.
 * (Currently not mounted in the main layout — available for future use.)
 */

const AgentsPanel = (() => {
  'use strict';

  let _root;

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();
    _root.querySelector('#agents-refresh').addEventListener('click', refresh);
    refresh();
  }

  async function refresh() {
    _showSkeleton();
    try {
      const { agents = [] } = await CicAPI.listAgents();
      _clearError();
      _renderAgents(agents);
    } catch (err) {
      _showError(err.message);
    }
  }

  function _html() {
    return `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Agents</span>
          <div class="panel-actions">
            <button id="agents-refresh">↻ Refresh</button>
          </div>
        </div>
        <div class="panel-body">
          <div id="agents-error"></div>
          <div id="agents-list">${_skeletonCards(4)}</div>
        </div>
      </div>`;
  }

  function _renderAgents(agents) {
    const el = document.getElementById('agents-list');
    if (!el) return;

    if (!agents.length) {
      el.innerHTML = `<div class="empty-state">No agents registered</div>`;
      return;
    }

    el.innerHTML = agents.map(a => `
      <div class="service-status ${a.status === 'ok' ? 'ok' : 'error'}" style="margin-bottom:8px">
        <div class="status-dot"></div>
        <span>${esc(a.name ?? a.id)}</span>
        <span class="service-meta">${esc(a.version ?? '')} ${esc(a.ts ?? '')}</span>
      </div>`).join('');
  }

  function _showError(msg) {
    const errEl = document.getElementById('agents-error');
    if (errEl) errEl.innerHTML = `
      <div class="error-banner">
        <span class="error-banner-msg">⚠ ${esc(msg)}</span>
        <button onclick="AgentsPanel.refresh()">Retry</button>
      </div>`;
    const lst = document.getElementById('agents-list');
    if (lst) lst.innerHTML = '';
  }

  function _clearError() {
    const errEl = document.getElementById('agents-error');
    if (errEl) errEl.innerHTML = '';
  }

  function _showSkeleton() {
    const el = document.getElementById('agents-list');
    if (el) el.innerHTML = _skeletonCards(4);
  }

  function _skeletonCards(n) {
    return Array.from({ length: n }, () =>
      `<div class="skeleton skeleton-card"></div>`
    ).join('');
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { mount, refresh };
})();

window.AgentsPanel = AgentsPanel;
