/**
 * js/pipelines-panel.js
 * @version 2.1.0
 * @date 2026-05-17
 *
 * CIC Pipeline trigger panel — intelligence service health + pipeline run form.
 * Skeleton on load, error banner with retry, status auto-poll.
 */

const PipelinesPanel = (() => {
  'use strict';

  let _root;
  let _running = false;

  // ── Public ──────────────────────────────────────────────────────────

  function mount(container) {
    _root = container;
    _root.innerHTML = _html();

    _root.querySelector('#cic-status-refresh').addEventListener('click', refreshStatus);
    _root.querySelector('#run-pipeline-btn').addEventListener('click', _runPipeline);

    refreshStatus();
    setInterval(refreshStatus, 30_000);
  }

  async function refreshStatus() {
    const el = document.getElementById('cic-health');
    if (!el) return;

    el.innerHTML = `<div class="status-dot"></div><span>Checking…</span>`;
    el.className = 'service-status';

    try {
      const status = await CicAPI.cicStatus();
      el.className = 'service-status ok';
      el.innerHTML = `
        <div class="status-dot"></div>
        <span>Intelligence service online</span>
        <span class="service-meta">v${status.version ?? '?'} · ${status.ts ?? ''}</span>`;
    } catch (err) {
      el.className = 'service-status error';
      el.innerHTML = `
        <div class="status-dot"></div>
        <span>Intelligence service offline</span>
        <span class="service-meta">${esc(err.message)}</span>`;
    }
  }

  // ── HTML shell ──────────────────────────────────────────────────────

  function _html() {
    return `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">CIC Pipeline</span>
          <div class="panel-actions">
            <button id="cic-status-refresh">↻ Status</button>
          </div>
        </div>
        <div class="panel-body" style="display:flex;gap:20px;flex-wrap:wrap">

          <!-- Service health -->
          <div style="flex:1;min-width:220px">
            <div class="section-title">Intelligence Service</div>
            <div id="cic-health" class="service-status">
              <div class="status-dot"></div>
              <span>Checking…</span>
            </div>
          </div>

          <!-- Pipeline trigger -->
          <div style="flex:2;min-width:320px">
            <div class="section-title">Run Pipeline</div>
            <div id="pipeline-error"></div>
            <div class="pipeline-form">
              <textarea id="pipeline-text" rows="3"
                placeholder="Paste archival text to ingest + analyze…"></textarea>
              <div class="pipeline-row">
                <select id="pipeline-intent">
                  <option value="research">research</option>
                  <option value="events">events</option>
                  <option value="people">people</option>
                  <option value="locations">locations</option>
                </select>
                <button id="run-pipeline-btn" class="btn-primary">▶ Run</button>
              </div>
            </div>
            <div id="pipeline-result"></div>
          </div>

        </div>
      </div>`;
  }

  // ── Run ─────────────────────────────────────────────────────────────

  async function _runPipeline() {
    if (_running) return;

    const text   = document.getElementById('pipeline-text')?.value?.trim() ?? '';
    const intent = document.getElementById('pipeline-intent')?.value ?? 'research';
    const btnEl  = document.getElementById('run-pipeline-btn');
    const resEl  = document.getElementById('pipeline-result');
    const errEl  = document.getElementById('pipeline-error');

    if (!text) {
      resEl.innerHTML = `<div class="error-banner"><span>Paste text first.</span></div>`;
      return;
    }

    _running = true;
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '…Running'; }
    if (errEl) errEl.innerHTML = '';
    if (resEl) resEl.innerHTML = `<div class="skeleton skeleton-card"></div>`;

    try {
      const result = await CicAPI.cicPipeline({
        user_id: CicAPI.currentEmail() ?? 'operator',
        intent,
        text,
        source: 'operator-ui',
      });
      if (errEl) errEl.innerHTML = '';
      _renderResult(result, resEl);
    } catch (err) {
      if (errEl) errEl.innerHTML = `
        <div class="error-banner">
          <span class="error-banner-msg">⚠ ${esc(err.message)}</span>
          <button onclick="document.getElementById('run-pipeline-btn').click()">Retry</button>
        </div>`;
      if (resEl) resEl.innerHTML = '';
    } finally {
      _running = false;
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = '▶ Run'; }
    }
  }

  function _renderResult(r, el) {
    el.innerHTML = `
      <div class="result-card">
        <div class="result-meta">
          ${esc(r.strategy ?? '—')} ·
          ${r.tokens_prompt ?? 0}+${r.tokens_completion ?? 0} tokens ·
          ${r.duration_ms ?? '—'}ms ·
          <span class="mono">${esc((r.correlation_id ?? '').slice(0, 8))}</span>
        </div>
        <div class="result-answer">${esc(r.answer ?? '(no answer)')}</div>
      </div>`;
  }

  // ── Helper ──────────────────────────────────────────────────────────

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { mount, refreshStatus };
})();

window.PipelinesPanel = PipelinesPanel;
