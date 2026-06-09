import { MemoryStore } from '../../memory/MemoryStore';

export class WaylandSessionMapper {
  private sessionToPlan = new Map<string, string>();
  private sessionToRun = new Map<string, string>();

  constructor(private memory?: MemoryStore) {}

  mapPlan(sessionId: string, planId: string) {
    this.sessionToPlan.set(sessionId, planId);
  }

  mapRun(sessionId: string, runId: string) {
    this.sessionToRun.set(sessionId, runId);

    // Log session mapping to MLA when both plan and run are known
    const planId = this.sessionToPlan.get(sessionId);
    if (planId && this.memory) {
      this.memory.writeSessionMapping(sessionId, planId, runId);
    }
  }

  getPlan(sessionId: string) {
    return this.sessionToPlan.get(sessionId);
  }

  getRun(sessionId: string) {
    return this.sessionToRun.get(sessionId);
  }
}
