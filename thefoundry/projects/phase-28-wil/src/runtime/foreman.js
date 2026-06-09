/**
 * CIC Foreman — Wayland agent entrypoint
 * Orchestrates CIC autonomy stack (Phases 23–27) for Wayland integration
 */

const { WaylandSessionMapper } = require('../session/WaylandSessionMapper');
const { WaylandShellAdapter } = require('./adapters/WaylandShellAdapter');
const { WaylandFileAdapter } = require('./adapters/WaylandFileAdapter');

const state = {
  activeSessions: new Map(),
  shellAdapter: new WaylandShellAdapter(),
  fileAdapter: new WaylandFileAdapter(),
};

/**
 * Main entry point: accept Wayland session request
 */
async function handleWaylandRequest(req) {
  console.log(`[Foreman] Session ${req.sessionId} received: "${req.instruction}"`);

  let mapper = state.activeSessions.get(req.sessionId);
  if (!mapper) {
    mapper = new WaylandSessionMapper(req.sessionId);
    state.activeSessions.set(req.sessionId, mapper);
    console.log(`[Foreman] New session created: ${req.sessionId}`);
  }

  try {
    // TODO: (Phase 28.2) Call APR (Phase 25) → generate plan from instruction
    // TODO: (Phase 28.2) Call CRO (Phase 26) → execute plan
    // TODO: (Phase 28.3) Log events to MLA (Phase 23)
    // TODO: (Phase 28.3) Update CKG (Phase 27)

    console.log(`[Foreman] Session ${req.sessionId} processing started`);
    console.log(`[Foreman] Planning phase would invoke APR here`);
    console.log(`[Foreman] Execution phase would invoke CRO here`);
  } catch (err) {
    console.error(`[Foreman] Session ${req.sessionId} error:`, err);
    throw err;
  }
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('[Foreman] Shutting down...');
  state.activeSessions.clear();
}

// CLI entry point for testing
if (require.main === module) {
  const testRequest = {
    sessionId: 'test-session-001',
    instruction: 'Research family history for Sørensen',
    context: { domain: 'genealogy' },
  };

  handleWaylandRequest(testRequest)
    .then(() => {
      console.log('[Foreman] Test request completed');
      shutdown();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Foreman] Test request failed:', err);
      shutdown();
      process.exit(1);
    });
}

module.exports = { handleWaylandRequest, shutdown };
