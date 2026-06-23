// File: projects/cic/src/agents/roadmapping/arps-memory-integration.ts | Date: 2026-06-03 | v1.0.0
export class ArpsMemoryIntegration {
    constructor(substrate) {
        this.substrate = substrate;
    }
    getRepeatedFailures() {
        const events = this.substrate.query({ type: "docs.build" });
        return events.filter(e => e.payload && e.payload.ok === false);
    }
    getPromptDriftTrend() {
        const events = this.substrate.query({ type: "sandbox.decision" });
        return events.map(e => e.payload?.similarity).filter(s => typeof s === "number");
    }
    getStalePhases() {
        const deltas = this.substrate.query({ type: "roadmap.delta" });
        const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
        return deltas.filter(e => new Date(e.timestamp).getTime() < cutoff);
    }
    buildArpsHints() {
        return {
            repeatedFailures: this.getRepeatedFailures().length,
            driftTrend: this.getPromptDriftTrend(),
            stalePhases: this.getStalePhases().length
        };
    }
}
//# sourceMappingURL=arps-memory-integration.js.map