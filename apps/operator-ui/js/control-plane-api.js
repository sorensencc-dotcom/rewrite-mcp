/**
 * js/control-plane-api.js
 * @version 2.1.0
 * @date 2026-05-17
 *
 * Operator-UI API client.
 * Google Identity Services sign-in, token management, all control-plane HTTP calls.
 *
 * Global: window.CicAPI
 * Depends on: Google Identity Services script (loaded in HTML)
 *
 * Changes from v2.0.0:
 *   - init() accepts onSignedIn callback(email) instead of relying solely on
 *     CustomEvent — simpler wiring from boot script.
 *   - _req: attaches X-Correlation-ID to every outbound request for tracing.
 *   - Added getHealth(), triggerRun() helpers.
 */

const CicAPI = (() => {
  'use strict';

  const BASE = window.CIC_CONTROL_PLANE_URL ?? 'http://localhost:3000';
  let _idToken   = null;
  let _userEmail = null;

  // ── Auth ──────────────────────────────────────────────────────────────

  /**
   * @param {string} googleClientId
   * @param {(email: string) => void} onSignedIn  — called after successful sign-in
   */
  function init(googleClientId, onSignedIn) {
    if (!window.google?.accounts?.id) {
      console.error('[CicAPI] Google Identity Services not loaded');
      return;
    }
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback:  ({ credential }) => {
        _idToken = credential;
        try {
          // Decode JWT payload (base64url) to extract email — no crypto needed for display
          const parts   = credential.split('.');
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          _userEmail = payload.email ?? 'operator';
        } catch (_) {
          _userEmail = 'operator';
        }
        window.dispatchEvent(new CustomEvent('cic:signed-in', { detail: { token: credential, email: _userEmail } }));
        if (typeof onSignedIn === 'function') onSignedIn(_userEmail);
      },
    });
    google.accounts.id.prompt();
  }

  function signOut() {
    _idToken   = null;
    _userEmail = null;
    window.dispatchEvent(new CustomEvent('cic:signed-out'));
  }

  function isSignedIn()  { return !!_idToken; }
  function currentEmail() { return _userEmail; }

  // ── HTTP ──────────────────────────────────────────────────────────────

  let _reqCounter = 0;

  async function _req(method, path, body) {
    const correlationId = `op-${Date.now()}-${(++_reqCounter).toString(16)}`;
    const headers = {
      'Content-Type':    'application/json',
      'X-Correlation-ID': correlationId,
    };
    if (_idToken) headers['Authorization'] = `Bearer ${_idToken}`;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(
        new Error(json.error ?? `HTTP ${res.status}`),
        { status: res.status, correlationId }
      );
    }
    return json;
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    // Auth
    init, signOut, isSignedIn, currentEmail,

    // Unauthenticated
    getHealth:       ()  => _req('GET',  '/health'),

    // Protected
    getMetrics:      ()  => _req('GET',  '/metrics'),
    getSLOMetrics:   ()  => _req('GET',  '/api/control-plane/metrics/slo'),
    listRuns:        ()  => _req('GET',  '/runs'),
    listPipelines:   ()  => _req('GET',  '/pipelines'),
    listAgents:      ()  => _req('GET',  '/agents'),

    // Telemetry
    getTelemetryPacks:      () => _req('GET', '/telemetry/packs'),
    getTelemetryDrift:      () => _req('GET', '/telemetry/drift'),
    getTelemetryModelCalls: () => _req('GET', '/telemetry/model-calls'),
    getTelemetryPipelines:  () => _req('GET', '/telemetry/pipelines'),

    // Recovery
    getRecoveryHistory:     () => _req('GET', '/recovery/history'),

    // CIC Intelligence
    cicStatus:       ()  => _req('GET',  '/pipelines/cic/status'),
    cicAsk:       (b)    => _req('POST', '/pipelines/cic/ask',      b),
    cicIngest:    (b)    => _req('POST', '/pipelines/cic/ingest',   b),
    cicPipeline:  (b)    => _req('POST', '/pipelines/cic/pipeline', b),
    cicPostiz:    (b)    => _req('POST', '/pipelines/cic/postiz',   b),

    // Convenience alias
    triggerRun:   (b)    => _req('POST', '/pipelines/cic/pipeline', b),
  };
})();

window.CicAPI = CicAPI;
