/**
 * WaylandSessionMapper — Correlate Wayland sessions ↔ CIC runs
 * Maps Wayland session/run IDs to APR plans and CRO executions
 */

class WaylandSessionMapper {
  constructor(sessionId, context) {
    this.sessionMapping = {
      waylandSessionId: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      context,
    };
    console.log(`[SessionMapper] Created mapping for session: ${sessionId}`);
    this.runMappings = new Map();
  }

  /**
   * Register APR plan for this session
   */
  registerAprPlan(aprPlanId) {
    this.sessionMapping.aprPlanId = aprPlanId;
    this.sessionMapping.lastActivity = new Date();
    console.log(
      `[SessionMapper] Registered APR plan: ${this.sessionMapping.waylandSessionId} → ${aprPlanId}`
    );
  }

  /**
   * Register CRO execution for this session
   */
  registerCroPlan(croPlanId) {
    this.sessionMapping.croPlanId = croPlanId;
    this.sessionMapping.lastActivity = new Date();
    console.log(
      `[SessionMapper] Registered CRO plan: ${this.sessionMapping.waylandSessionId} → ${croPlanId}`
    );
  }

  /**
   * Register a run within this session
   */
  registerRun(waylandRunId, croRunId) {
    const mapping = {
      waylandRunId,
      croRunId,
      waylandSessionId: this.sessionMapping.waylandSessionId,
      status: 'pending',
    };

    this.runMappings.set(waylandRunId, mapping);
    this.sessionMapping.lastActivity = new Date();

    console.log(
      `[SessionMapper] Registered run: ${waylandRunId} → ${croRunId || 'pending'}`
    );
  }

  /**
   * Start a run
   */
  startRun(waylandRunId) {
    const mapping = this.runMappings.get(waylandRunId);
    if (!mapping) {
      throw new Error(`[SessionMapper] Run not found: ${waylandRunId}`);
    }

    mapping.status = 'running';
    mapping.startTime = new Date();
    this.sessionMapping.lastActivity = new Date();

    console.log(`[SessionMapper] Started run: ${waylandRunId}`);
  }

  /**
   * Complete a run
   */
  completeRun(waylandRunId, success) {
    const mapping = this.runMappings.get(waylandRunId);
    if (!mapping) {
      throw new Error(`[SessionMapper] Run not found: ${waylandRunId}`);
    }

    mapping.status = success ? 'complete' : 'failed';
    mapping.endTime = new Date();
    this.sessionMapping.lastActivity = new Date();

    const duration = mapping.endTime.getTime() - (mapping.startTime?.getTime() ?? 0);
    console.log(
      `[SessionMapper] Completed run: ${waylandRunId} (${duration}ms, ${mapping.status})`
    );
  }

  /**
   * Get session mapping
   */
  getSessionMapping() {
    return this.sessionMapping;
  }

  /**
   * Get all run mappings
   */
  getRunMappings() {
    return this.runMappings;
  }

  /**
   * Get a specific run mapping
   */
  getRunMapping(waylandRunId) {
    return this.runMappings.get(waylandRunId);
  }

  /**
   * Serialize for storage in MLA (Phase 28.3)
   */
  serialize() {
    return JSON.stringify(
      {
        session: this.sessionMapping,
        runs: Array.from(this.runMappings.entries()).map(([id, mapping]) => ({
          id,
          ...mapping,
        })),
      },
      null,
      2
    );
  }
}

module.exports = { WaylandSessionMapper };
