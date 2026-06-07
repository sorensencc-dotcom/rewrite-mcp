/**
 * js/release-bundle-panel.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Release Bundle Panel for CIC Operator Console.
 * Fetches and displays the latest .tar.gz bundle and its SHA256 checksum.
 */

const ReleaseBundlePanel = (() => {
  'use strict';

  let _container = null;

  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _renderSkeleton();
    loadReleaseBundle();
  }

  function _renderSkeleton() {
    _container.innerHTML = `
      <h2>Release Bundle</h2>

      <div id="bundle-meta">
        <span id="bundle-name">Scanning bundles...</span>
        <span id="bundle-tag"></span>
      </div>

      <pre id="bundle-checksum">Loading checksum...</pre>

      <div id="bundle-controls" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
        <button id="bundle-refresh" class="btn-small" type="button">REFRESH</button>
        <div id="bundle-links">
          <a id="bundle-download" target="_blank" class="btn-small" style="text-decoration:none;">DOWNLOAD BUNDLE</a>
        </div>
      </div>
    `;

    document.getElementById('bundle-refresh').addEventListener('click', loadReleaseBundle);
  }

  async function loadReleaseBundle() {
    try {
      const nameEl = document.getElementById("bundle-name");
      const tagEl = document.getElementById("bundle-tag");
      const checksumEl = document.getElementById("bundle-checksum");
      const downloadLink = document.getElementById("bundle-download");

      if (checksumEl) checksumEl.textContent = "Loading checksum...";

      // 1. Fetch directory listing
      const res = await fetch("/docs/releases/");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // 2. Extract filenames for .tar.gz bundles
      const bundles = [...html.matchAll(/href="([^"]+\.tar\.gz)"/g)]
        .map(m => m[1])
        .sort()
        .reverse();

      if (!bundles.length) {
        if (nameEl) nameEl.textContent = "No bundles found.";
        if (checksumEl) checksumEl.textContent = "N/A";
        return;
      }

      const latest = bundles[0];
      const version = latest
        .replace("rewrite-mcp-release-v", "")
        .replace(".tar.gz", "");

      // 3. Load checksum
      const checksumRes = await fetch(`/docs/releases/${latest}.sha256`);
      if (!checksumRes.ok) throw new Error(`HTTP ${checksumRes.status}`);
      const checksum = await checksumRes.text();

      // 4. Update panel
      if (nameEl) nameEl.textContent = latest;
      if (tagEl) tagEl.textContent = `TAG: v${version}`;
      if (checksumEl) checksumEl.textContent = checksum.trim();

      // 5. Download link
      if (downloadLink) downloadLink.href = `/docs/releases/${latest}`;
      
    } catch (err) {
      console.error('[ReleaseBundlePanel] Failed to load:', err);
      const checksumEl = document.getElementById("bundle-checksum");
      if (checksumEl) checksumEl.textContent = `Error: ${err.message}`;
    }
  }

  return { init, refresh: loadReleaseBundle };
})();

window.ReleaseBundlePanel = ReleaseBundlePanel;
