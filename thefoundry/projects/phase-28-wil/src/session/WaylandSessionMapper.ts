/**
 * WaylandSessionMapper — Correlate Wayland sessions ↔ CIC runs
 * Maps Wayland session/run IDs to APR plans and CRO executions
 */

export interface SessionMapping {
  waylandSessionId: string;
  aprPlanId?: string;
  croPlanId?: string;
  createdAt: Date;
  lastActivity: Date;
  context?: Record<string, unknown>;
}

export interface RunMapping {
  waylandRunId: string;
  croRunId?: string;
  waylandSessionId: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  startTime?: Date;
  endTime?: Date;
}

export class WaylandSessionMapper {
  private sessionMapping: SessionMapping;
  private runMappings: Map<string, RunMapping> = new Map();

  constructor(sessionId: string, context?: Record<string, unknown>) {
    this.sessionMapping = {
      waylandSessionId: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      context,
    };
    console.log(`[SessionMapper] Created mapping for session: ${sessionId}`);
  }

  /**
   * Register APR plan for this session
   */
  registerAprPlan(aprPlanId: string): void {
    this.sessionMapping.aprPlanId = aprPlanId;
    this.sessionMapping.lastActivity = new Date();
    console.log(
      `[SessionMapper] Registered APR plan: ${this.sessionMapping.waylandSessionId} → ${aprPlanId}`
    );
  }

  /**
   * Register CRO execution for this session
   */
  registerCroPlan(croPlanId: string): void {
    this.sessionMapping.croPlanId = croPlanId;
    this.sessionMapping.lastActivity = new Date();
    console.log(
      `[SessionMapper] Registered CRO plan: ${this.sessionMapping.waylandSessionId} → ${croPlanId}`
    );
  }

  /**
   * Register a run within this session
   */
  registerRun(waylandRunId: string, croRunId?: string): void {
    const mapping: RunMapping = {
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
  startRun(waylandRunId: string): void {
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
  completeRun(waylandRunId: string, success: boolean): void {
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
  getSessionMapping(): SessionMapping {
    return this.sessionMapping;
  }

  /**
   * Get all run mappings
   */
  getRunMappings(): Map<string, RunMapping> {
    return this.runMappings;
  }

  /**
   * Get a specific run mapping
   */
  getRunMapping(waylandRunId: string): RunMapping | undefined {
    return this.runMappings.get(waylandRunId);
  }

  /**
   * Serialize for storage in MLA (Phase 28.3)
   */
  serialize(): string {
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
