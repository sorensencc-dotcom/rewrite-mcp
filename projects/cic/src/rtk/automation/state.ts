import { IngestionBurst, RTKAutomationState } from "./types";

export class RTKAutomationStateTracker {
  private state: RTKAutomationState = {
    version: "1.1.0",
    active_section_id: null,
    open_bursts: [],
    blocked_sections: [],
    failure_rate: 0,
  };

  getState(): RTKAutomationState {
    return this.state;
  }

  setActiveSection(sectionId: string | null): void {
    this.state.active_section_id = sectionId;
  }

  addBurst(burst: IngestionBurst): void {
    this.state.open_bursts.push(burst);
  }

  updateBurstStatus(burstId: string, status: IngestionBurst["status"]): void {
    const burst = this.state.open_bursts.find((b) => b.burst_id === burstId);
    if (burst) {
      burst.status = status;
    }
  }

  completeBurst(burstId: string): void {
    this.state.open_bursts = this.state.open_bursts.filter((b) => b.burst_id !== burstId);
  }

  blockSection(sectionId: string): void {
    if (!this.state.blocked_sections.includes(sectionId)) {
      this.state.blocked_sections.push(sectionId);
    }
  }

  setFailureRate(rate: number): void {
    this.state.failure_rate = rate;
  }
}
