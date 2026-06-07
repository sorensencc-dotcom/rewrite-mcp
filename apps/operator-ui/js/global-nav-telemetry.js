// File: apps/operator-ui/js/global-nav-telemetry.js | Date: 2026-05-31 | v1.0.0
// Description: Browser Telemetry Hooks emitting live UI health signals to the control plane.

(function () {
  'use strict';

  function emit(event, data = {}) {
    fetch('http://localhost:3000/cic-telemetry/ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ts: Date.now(), ...data })
    }).catch(() => {});
  }

  // Global Nav Loaded
  document.addEventListener('DOMContentLoaded', () => {
    emit('ui.dom_loaded');
  });

  // CIC CSS Loaded
  const css = document.querySelector('link[href*="cic.css"]');
  if (css) {
    css.addEventListener('load', () => emit('ui.cic_css_loaded'));
    css.addEventListener('error', () => emit('ui.cic_css_missing'));
  }

  // Dashboard Initialization
  window.addEventListener('dashboard:init', () => emit('ui.dashboard_init'));
  window.addEventListener('dashboard:error', e => emit('ui.dashboard_error', { error: e.detail }));
})();
