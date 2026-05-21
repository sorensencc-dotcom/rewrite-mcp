/**
 * js/release-notes-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Release Notes Panel for CIC Operator Console.
 * Fetches and displays the latest release summary from /docs/releases/.
 */

const ReleaseNotesPanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    loadReleaseNotes();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <h2>Release Notes</h2>

      <div id="release-meta">
        <span id="release-version">Loading...</span>
        <span id="release-date"></span>
      </div>

      <pre id="release-summary">Scanning releases...</pre>

      <div id="release-links-row" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
        <button id="release-refresh" class="btn-small" type="button">REFRESH</button>
        <div id="release-links">
          <a id="release-full-link" target="_blank" class="btn-small" style="text-decoration:none;">FULL NOTES</a>
          <a id="release-summary-link" target="_blank" class="btn-small" style="text-decoration:none;">RAW</a>
        </div>
      </div>
    `;

    document.getElementById('release-refresh').addEventListener('click', loadReleaseNotes);
  }

  async function loadReleaseNotes() {
    try {
      const summaryEl = document.getElementById("release-summary");
      const versionEl = document.getElementById("release-version");
      
      if (summaryEl) summaryEl.textContent = "Scanning releases...";

      // 1. Fetch directory listing
      const res = await fetch("/docs/releases/");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // 2. Extract filenames
      const files = [...html.matchAll(/href="([^"]+\.summary\.txt)"/g)]
        .map(m => m[1])
        .sort()
        .reverse();

      if (!files.length) {
        if (summaryEl) summaryEl.textContent = "No releases found.";
        if (versionEl) versionEl.textContent = "N/A";
        return;
      }

      const latestSummary = files[0];
      const version = latestSummary.replace(".summary.txt", "");

      // 3. Load summary text
      const summaryRes = await fetch(`/docs/releases/${latestSummary}`);
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);
      const summaryText = await summaryRes.text();

      // 4. Update panel
      if (versionEl) versionEl.textContent = `VERSION: ${version}`;
      if (summaryEl) summaryEl.textContent = summaryText.trim();

      // 5. Link to full notes
      const fullMd = latestSummary.replace(".summary.txt", ".md");
      const fullLink = document.getElementById("release-full-link");
      const rawLink = document.getElementById("release-summary-link");
      
      if (fullLink) fullLink.href = `/docs/releases/${fullMd}`;
      if (rawLink) rawLink.href = `/docs/releases/${latestSummary}`;
      
    } catch (err) {
      console.error('[ReleaseNotesPanel] Failed to load:', err);
      const summaryEl = document.getElementById("release-summary");
      if (summaryEl) summaryEl.textContent = `Error: ${err.message}`;
    }
  }

  return { init, refresh: loadReleaseNotes };
})();

window.ReleaseNotesPanel = ReleaseNotesPanel;
