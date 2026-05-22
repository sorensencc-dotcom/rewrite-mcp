/**
 * js/release-timeline-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Release Timeline Panel for CIC Operator Console.
 * Fetches and displays the chronological release timeline from /docs/releases/timeline.json.
 */

const ReleaseTimelinePanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    loadReleaseTimeline();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <h2>Release Timeline</h2>
      <div id="timeline-entries" style="flex: 1; overflow-y: auto; margin-bottom: 10px; padding-right: 5px;">
        Scanning timeline...
      </div>
      <div class="timeline-controls" style="margin-top: auto;">
        <button id="timeline-refresh-btn" class="btn-small" type="button">REFRESH</button>
      </div>
    `;

    document.getElementById('timeline-refresh-btn').addEventListener('click', loadReleaseTimeline);
  }

  async function loadReleaseTimeline() {
    try {
      const container = document.getElementById("timeline-entries");
      if (!container) return;
      
      container.innerHTML = "Scanning timeline...";

      const res = await fetch("/docs/releases/timeline.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const timeline = await res.json();

      if (!timeline.length) {
        container.innerHTML = '<div class="empty-msg">No timeline entries found.</div>';
        return;
      }

      container.innerHTML = "";

      for (const entry of timeline) {
        const div = document.createElement("div");
        div.className = "timeline-entry";

        const deltaColor = entry.delta > 0 ? "var(--online)" : entry.delta < 0 ? "var(--down)" : "var(--pending)";
        const deltaText = entry.delta > 0 ? `+${entry.delta}` : entry.delta;

        div.innerHTML = `
          <div class="timeline-header">
            <span class="timeline-version">v${entry.version}</span>
            <span class="timeline-date">${entry.date}</span>
          </div>

          <div class="timeline-delta" style="color:${deltaColor}">
            Δ ${deltaText} velocity
          </div>

          <div class="timeline-counts">
            +${entry.changes.added} added,
            +${entry.changes.fixed} fixed,
            +${entry.changes.infra} infra
          </div>

          <div class="timeline-links">
            <a href="/docs/releases/${entry.notes}" target="_blank" class="btn-small" style="text-decoration:none;">NOTES</a>
            <a href="/docs/releases/${entry.diff}" target="_blank" class="btn-small" style="text-decoration:none;">DIFF</a>
            ${entry.bundle ? `<a href="/docs/releases/${entry.bundle}" target="_blank" class="btn-small" style="text-decoration:none;">BUNDLE</a>` : ''}
          </div>
        `;

        container.appendChild(div);
      }
    } catch (err) {
      console.error('[ReleaseTimelinePanel] Failed to load:', err);
      const container = document.getElementById("timeline-entries");
      if (container) container.innerHTML = `<div class="empty-msg" style="color:var(--down)">Error: ${err.message}</div>`;
    }
  }

  return { init, refresh: loadReleaseTimeline };
})();

window.ReleaseTimelinePanel = ReleaseTimelinePanel;
