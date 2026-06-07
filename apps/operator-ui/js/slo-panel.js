/**
 * js/slo-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Antigravity SLO & Recovery Dashboard Panel.
 * Renders real-time SLO metrics, active policies, and recovery action history.
 */

const SloPanel = (() => {
  'use strict';

  let _container = null;
  let _timer = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    start();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <div class="slo-grid">
        <div class="slo-card" id="slo-reliability">
          <h3>Reliability</h3>
          <div class="slo-value" id="val-hard-failure">--</div>
          <div class="slo-label">Hard Failure Rate</div>
          <div class="slo-gauge"><div class="slo-bar" id="bar-hard-failure"></div></div>
        </div>
        <div class="slo-card" id="slo-safe-mode">
          <h3>Safe-Mode</h3>
          <div class="slo-value" id="val-safe-mode">--</div>
          <div class="slo-label">Engagement Rate</div>
          <div class="slo-gauge"><div class="slo-bar" id="bar-safe-mode"></div></div>
        </div>
        <div class="slo-card" id="slo-latency">
          <h3>Latency (p95)</h3>
          <div class="slo-value" id="val-latency-p95">--</div>
          <div class="slo-label">Seconds</div>
          <div class="slo-gauge"><div class="slo-bar" id="bar-latency-p95"></div></div>
        </div>
        <div class="slo-card" id="slo-budget">
          <h3>Error Budget</h3>
          <div class="slo-value" id="val-budget">--</div>
          <div class="slo-label">Remaining</div>
          <div class="slo-gauge"><div class="slo-bar" id="bar-budget"></div></div>
        </div>
      </div>
      <div class="recovery-section">
        <div class="active-policies-panel">
          <h3>Active Recovery Policies</h3>
          <ul id="active-policies-list">
            <li class="empty-msg">No active policies</li>
          </ul>
        </div>
        <div class="recovery-history-panel">
          <h3>Recovery Action History</h3>
          <table class="recovery-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Policy</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody id="recovery-history-body">
              <tr><td colspan="4" class="empty-msg">No actions recorded</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function update() {
    if (!CicAPI.isSignedIn()) return;

    try {
      const [slo, history] = await Promise.all([
        CicAPI.getSLOMetrics(),
        CicAPI.getRecoveryHistory()
      ]);

      _updateGauges(slo);
      _updatePolicies(slo.policySignals);
      _updateHistory(history.history);

    } catch (err) {
      console.error('[SloPanel] Update failed:', err);
    }
  }

  function _updateGauges(slo) {
    const hfr = (slo.reliability.hardFailureRate * 100).toFixed(2) + '%';
    const smr = (slo.reliability.safeModeRate * 100).toFixed(2) + '%';
    const lat = slo.latency.p95.toFixed(3) + 's';
    const bud = (slo.errorBudget.safeModeBudgetRemaining * 100).toFixed(1) + '%';

    document.getElementById('val-hard-failure').textContent = hfr;
    document.getElementById('val-safe-mode').textContent = smr;
    document.getElementById('val-latency-p95').textContent = lat;
    document.getElementById('val-budget').textContent = bud;

    _updateBar('bar-hard-failure', slo.reliability.hardFailureRate * 100, 1); // 1% threshold
    _updateBar('bar-safe-mode', slo.reliability.safeModeRate * 100, 3); // 3% threshold
    _updateBar('bar-latency-p95', slo.latency.p95 * 25, 100); // 4s threshold (4*25=100)
    _updateBar('bar-budget', slo.errorBudget.safeModeBudgetRemaining * 100, 100, true);
  }

  function _updateBar(id, value, threshold, inverse = false) {
    const bar = document.getElementById(id);
    if (!bar) return;
    const pct = Math.min(100, value);
    bar.style.width = pct + '%';
    
    const isWarn = inverse ? (value < 50) : (value > threshold * 0.7);
    const isCrit = inverse ? (value < 20) : (value > threshold);
    
    bar.className = 'slo-bar' + (isCrit ? ' crit' : (isWarn ? ' warn' : ''));
  }

  function _updatePolicies(signals) {
    const list = document.getElementById('active-policies-list');
    if (!list) return;

    if (!signals || !signals.activeActions || signals.activeActions.length === 0) {
      list.innerHTML = '<li class="empty-msg">No active policies</li>';
      return;
    }

    list.innerHTML = signals.activeActions.map(a => `
      <li class="policy-item">
        <span class="policy-id">${a.policyId}</span>
        <span class="policy-action">${a.type}</span>
        <span class="policy-trigger">${a.triggeredBy}: ${a.actualValue.toFixed(4)}</span>
      </li>
    `).join('');
  }

  function _updateHistory(history) {
    const body = document.getElementById('recovery-history-body');
    if (!body) return;

    if (!history || history.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="empty-msg">No actions recorded</td></tr>';
      return;
    }

    body.innerHTML = [...history].reverse().slice(0, 10).map(h => `
      <tr>
        <td>${h.timestamp.split('T')[1].split('.')[0]}</td>
        <td><span class="action-tag">${h.type}</span></td>
        <td>${h.policyId}</td>
        <td>${h.triggeredBy}</td>
      </tr>
    `).join('');
  }

  function start() {
    if (_timer) return;
    update();
    _timer = setInterval(update, 5000);
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  }

  return { init, start, stop, update };
})();

window.SloPanel = SloPanel;
