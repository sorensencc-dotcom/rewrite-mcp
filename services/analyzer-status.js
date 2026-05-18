// filename: services/analyzer-status.js
// date: 2026-05-16
// version: 1.0.0

/**
 * Analyzer Status Service
 *
 * Aggregates health state for all registered CIC analyzers.
 * Called by the control-plane /api/control-plane/analyzers route.
 *
 * Returns:
 *   { analyzers: AnalyzerStatus[], timestamp: string }
 *
 * Per-analyzer fields:
 *   name          — human-readable display name
 *   key           — registry key (e.g. "image:v2")
 *   ok            — boolean health state
 *   detail        — health detail string from healthCheck()
 *   geminiKey     — boolean: GEMINI_API_KEY present in environment
 *   lastCheckedMs — epoch ms of this check
 *   error         — error message if healthCheck() threw; null otherwise
 */

// ---------------------------------------------------------------------------
// Individual analyzer probes
// ---------------------------------------------------------------------------

/**
 * Probes ImageAnalyzerV2 health.
 * Guards against import-time throw (GEMINI_API_KEY guard in ImageAnalyzerV2.js)
 * by wrapping the dynamic import and healthCheck in a try/catch.
 *
 * @returns {Promise<{
 *   name: string,
 *   key: string,
 *   ok: boolean,
 *   detail: string,
 *   geminiKey: boolean,
 *   lastCheckedMs: number,
 *   error: string | null
 * }>}
 */
async function probeImageAnalyzerV2() {
  const checkedAt = Date.now();
  const geminiKey = typeof process.env.GEMINI_API_KEY === 'string'
    && process.env.GEMINI_API_KEY.length > 0;

  try {
    // Dynamic import guards against the module-level throw in ImageAnalyzerV2.js
    // when GEMINI_API_KEY is absent.
    const mod = await import(
      '../castironforge/src/cic/cic/analyzers/ImageAnalyzerV2.js'
    );
    const health = await mod.healthCheck();
    return {
      name: 'ImageAnalyzerV2',
      key: 'image:v2',
      ok: health.ok,
      detail: health.detail,
      geminiKey,
      lastCheckedMs: checkedAt,
      error: null,
    };
  } catch (err) {
    return {
      name: 'ImageAnalyzerV2',
      key: 'image:v2',
      ok: false,
      detail: 'healthCheck threw — see error field',
      geminiKey,
      lastCheckedMs: checkedAt,
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the aggregated analyzer status snapshot.
 *
 * @returns {Promise<{
 *   analyzers: object[],
 *   timestamp: string
 * }>}
 */
export async function getAnalyzerStatus() {
  const results = await Promise.allSettled([
    probeImageAnalyzerV2(),
  ]);

  const analyzers = results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : {
          name: 'unknown',
          key: 'unknown',
          ok: false,
          detail: 'probe rejected',
          geminiKey: false,
          lastCheckedMs: Date.now(),
          error: r.reason?.message ?? 'unknown error',
        }
  );

  return {
    analyzers,
    timestamp: new Date().toISOString(),
  };
}
