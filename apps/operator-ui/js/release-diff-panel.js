/**
 * js/release-diff-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Release Diff Panel for CIC Operator Console.
 * Fetches and displays the velocity delta between the latest and previous versions.
 */

const ReleaseDiffPanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    loadReleaseDiff();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <h2>Release Velocity Diff</h2>

      <div id="diff-meta">
        <span id="diff-versions">Scanning diffs...</span>
        <span id="diff-delta"></span>
      </div>

      <pre id="diff-summary">Calculating velocity delta...</pre>

      <div id="diff-controls" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
        <button id="diff-refresh" class="btn-small" type="button">REFRESH</button>
        <div id="diff-links">
          <a id="diff-full-link" target="_blank" class="btn-small" style="text-decoration:none;">FULL DIFF</a>
        </div>
      </div>
    `;

    document.getElementById('diff-refresh').addEventListener('click', loadReleaseDiff);
  }

  async function loadReleaseDiff() {
    try {
      const versionsEl = document.getElementById("diff-versions");
      const deltaEl = document.getElementById("diff-delta");
      const summaryEl = document.getElementById("diff-summary");
      const fullLink = document.getElementById("diff-full-link");

      if (summaryEl) summaryEl.textContent = "Loading diff...";

      // 1. Fetch directory listing
      const res = await fetch("/docs/releases/");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // 2. Extract filenames for diff summaries
      const diffs = [...html.matchAll(/href="(diff-[^"]+\.summary\.txt)"/g)]
        .map(m => m[1])
        .sort()
        .reverse();

      if (!diffs.length) {
        if (versionsEl) versionsEl.textContent = "No diffs found.";
        if (summaryEl) summaryEl.textContent = "N/A";
        return;
      }

      const latestDiff = diffs[0];
      const version = latestDiff.replace("diff-", "").replace(".summary.txt", "");

      // 3. Load summary text
      const diffRes = await fetch(`/docs/releases/${latestDiff}`);
      if (!diffRes.ok) throw new Error(`HTTP ${diffRes.status}`);
      const diffText = await diffRes.text();

      // 4. Update panel
      if (versionsEl) versionsEl.textContent = `DIFF: v${version} vs Previous`;
      if (summaryEl) summaryEl.textContent = diffText.trim();
      
      // Extract delta from summary for highlighting
      const deltaMatch = diffText.match(/([-+]?\d+) change velocity delta/);
      if (deltaMatch && deltaEl) {
        const delta = parseInt(deltaMatch[1], 10);
        deltaEl.textContent = `DELTA: ${delta >= 0 ? '+' : ''}${delta}`;
        deltaEl.style.color = delta >= 0 ? 'var(--online)' : 'var(--degraded)';
      }

      // 5. Link to full diff
      const fullMd = latestDiff.replace(".summary.txt", ".md");
      if (fullLink) fullLink.href = `/docs/releases/${fullMd}`;
      
    } catch (err) {
      console.error('[ReleaseDiffPanel] Failed to load:', err);
      const summaryEl = document.getElementById("diff-summary");
      if (summaryEl) summaryEl.textContent = `Error: ${err.message}`;
    }
  }

  return { init, refresh: loadReleaseDiff };
})();

window.ReleaseDiffPanel = ReleaseDiffPanel;
