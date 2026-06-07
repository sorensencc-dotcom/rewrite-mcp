/**
 * js/introspection-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Cognitive Trace Dashboard Panel.
 * Renders the 'why' behind autonomous interventions.
 */

const IntrospectionPanel = (() => {
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
        <h2>MAS Cognitive Trace (Introspection)</h2>
        <div class="mas-stat"><span class="mas-stat-label" style="font-size:10px;">Deep Trace Recorder</span></div>
      </div>

      <div id="introspection-content" class="introspection-content">
        <div class="empty-msg">No cognitive traces recorded. Waiting for mitigation events...</div>
      </div>

      <style>
        .introspection-content {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #c9d1d9;
        }
        .trace-entry {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
          border-left: 4px solid var(--accent);
        }
        .trace-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          border-bottom: 1px solid #30363d;
          padding-bottom: 8px;
        }
        .trace-title { font-weight: 800; color: var(--accent); }
        .trace-meta { color: #8b949e; font-size: 10px; }

        .introspection-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .introspection-section h4 {
          font-size: 9px;
          color: #8b949e;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.1em;
        }

        /* Feature Attribution Bars */
        .feature-bar-wrap { margin-bottom: 6px; }
        .feature-label { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
        .feature-bar { height: 4px; background: #21262d; border-radius: 2px; overflow: hidden; }
        .feature-fill { height: 100%; background: var(--accent); transition: width 0.5s ease; }

        /* Decision Path */
        .decision-path {
          list-style: none;
          padding-left: 12px;
          border-left: 1px dashed #30363d;
          margin: 0;
        }
        .decision-path li { margin-bottom: 4px; position: relative; }
        .decision-path li::before { content: '→'; position: absolute; left: -14px; color: #8b949e; }

        /* Counterfactuals */
        .counterfactual-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #0b0e14;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #30363d;
          margin-top: 12px;
        }
        .cf-item { text-align: center; }
        .cf-label { font-size: 8px; color: #8b949e; text-transform: uppercase; }
        .cf-val { font-size: 12px; font-weight: bold; }
        .cf-bad { color: var(--down); }
        .cf-good { color: var(--online); }

        .confidence-ring {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: #8b949e;
          margin-top: 8px;
        }
        .confidence-val { font-weight: bold; color: #c9d1d9; }
      </style>
    `;
  }

  function update(records) {
    if (!_container || !records.length) return;

    const content = document.getElementById('introspection-content');
    
    // We only show the latest 3 traces to keep the panel focused
    const html = records.slice(0, 3).map(r => _renderTrace(r)).join('');
    content.innerHTML = html;
  }

  function _renderTrace(r) {
    const ts = new Date(r.timestamp).toLocaleTimeString([], { hour12: false });
    const confColor = r.confidence > 0.8 ? 'var(--online)' : r.confidence > 0.6 ? 'var(--degraded)' : 'var(--down)';

    return `
      <div class="trace-entry">
        <div class="trace-header">
          <span class="trace-title">${r.type.toUpperCase()}</span>
          <span class="trace-meta">[${ts}] ID: ${r.id}</span>
        </div>

        <div class="introspection-grid">
          <div class="introspection-section">
            <h4>Feature Attribution (Cognitive Weight)</h4>
            ${Object.entries(r.featureAttribution).map(([key, data]) => `
              <div class="feature-bar-wrap">
                <div class="feature-label">
                  <span>${key}</span>
                  <span>${(data.weight * 100).toFixed(0)}%</span>
                </div>
                <div class="feature-bar">
                  <div class="feature-fill" style="width: ${data.weight * 100}%"></div>
                </div>
              </div>
            `).join('')}
            
            <div class="confidence-ring">
              Cognitive Confidence: <span class="confidence-val" style="color:${confColor}">${(r.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div class="introspection-section">
            <h4>Decision Path</h4>
            <ul class="decision-path">
              ${r.decisionPath.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="counterfactual-box">
          <div class="cf-item">
            <div class="cf-label">Without Mitigation</div>
            <div class="cf-val cf-bad">TTI ${r.counterfactuals.noMitigation.projectedTTI}m | ${r.counterfactuals.noMitigation.projectedFailures} Failures</div>
          </div>
          <div class="cf-item" style="border-left: 1px solid #30363d;">
            <div class="cf-label">With Mitigation</div>
            <div class="cf-val cf-good">TTI ${r.counterfactuals.withMitigation.projectedTTI}m | ${r.counterfactuals.withMitigation.projectedFailures} Failures</div>
          </div>
        </div>
      </div>
    `;
  }

  return { init, update };
})();

window.IntrospectionPanel = IntrospectionPanel;
