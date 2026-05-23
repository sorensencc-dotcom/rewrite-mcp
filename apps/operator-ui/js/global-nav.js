/**
 * js/global-nav.js
 * CIC Global Navigation System
 * Injects a unified navigation bar into all workspace surfaces.
 */

(function injectGlobalNav() {
  'use strict';

  const navHtml = `
    <nav class="cic-global-nav">
      <div class="nav-brand">
        <a href="/index.html">CIC COMMAND CENTER</a>
      </div>
      <div class="nav-links">
        <a href="/control-room.html">Operations</a>
        <a href="/dashboard/index.html">Analytics</a>
        <a href="/../../tools/prompt-telemetry/dashboard.html">Telemetry</a>
        <a href="/../../site/index.html">Documentation</a>
        <a href="http://localhost:5230" target="_blank">Memos</a>
        <a href="http://localhost:8501" target="_blank">Research</a>
      </div>
      <div class="nav-status">
        <span class="status-dot"></span>
        SYSTEM LIVE
      </div>
    </nav>
  `;

  const navStyle = `
    .cic-global-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      height: 40px;
      background: #0a0806; /* var(--black) */
      border-bottom: 2px solid #C4501A; /* var(--ember) */
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
    }

    .nav-brand a {
      color: #B8922A; /* var(--brass) */
      text-decoration: none;
      font-weight: 900;
      font-size: 0.8rem;
    }

    .nav-links {
      display: flex;
      gap: 1.5rem;
    }

    .nav-links a {
      color: #9a9088; /* var(--ash) */
      text-decoration: none;
      transition: all 0.2s;
      font-weight: 600;
    }

    .nav-links a:hover {
      color: #faf6f0; /* var(--white) */
      text-shadow: 0 0 8px rgba(196, 80, 26, 0.4);
    }

    .nav-status {
      color: #faf6f0;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.65rem;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: #5a9e6f;
      border-radius: 0; /* mandate */
      box-shadow: 0 0 8px #5a9e6f;
    }

    /* Adjust page layout for nav */
    body {
      margin-top: 40px !important;
    }
  `;

  // Inject Style
  const styleEl = document.createElement('style');
  styleEl.textContent = navStyle;
  document.head.appendChild(styleEl);

  // Inject HTML
  const navContainer = document.createElement('div');
  navContainer.innerHTML = navHtml;
  document.body.prepend(navContainer.firstElementChild);

})();
