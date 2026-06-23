"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTKAutomationStateTracker = void 0;
class RTKAutomationStateTracker {
    constructor() {
        this.state = {
            version: "1.1.0",
            active_section_id: null,
            open_bursts: [],
            blocked_sections: [],
            failure_rate: 0,
        };
    }
    getState() {
        return this.state;
    }
    setActiveSection(sectionId) {
        this.state.active_section_id = sectionId;
    }
    addBurst(burst) {
        this.state.open_bursts.push(burst);
    }
    updateBurstStatus(burstId, status) {
        const burst = this.state.open_bursts.find((b) => b.burst_id === burstId);
        if (burst) {
            burst.status = status;
        }
    }
    completeBurst(burstId) {
        this.state.open_bursts = this.state.open_bursts.filter((b) => b.burst_id !== burstId);
    }
    blockSection(sectionId) {
        if (!this.state.blocked_sections.includes(sectionId)) {
            this.state.blocked_sections.push(sectionId);
        }
    }
    setFailureRate(rate) {
        this.state.failure_rate = rate;
    }
}
exports.RTKAutomationStateTracker = RTKAutomationStateTracker;
//# sourceMappingURL=state.js.map