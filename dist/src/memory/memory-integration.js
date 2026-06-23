"use strict";
/**
 * Phase 23 Memory Layer Integration
 * Wires substrate, harvester, and synthesizer into a unified memory system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryLayer = void 0;
exports.initializeMemoryLayer = initializeMemoryLayer;
exports.getMemoryLayer = getMemoryLayer;
const memory_substrate_1 = require("./memory-substrate");
const memory_harvester_1 = require("./memory-harvester");
const memory_synthesizer_1 = require("./memory-synthesizer");
class MemoryLayer {
    constructor(storePath = "./memory_store.jsonl") {
        this.substrate = new memory_substrate_1.MemorySubstrate({
            store_path: storePath,
            max_file_size_mb: 100,
            auto_archive: true,
            archive_destination: "./memory_archive",
        });
        const sessionId = `session_${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 8)}_${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
        this.harvester = new memory_harvester_1.MemoryHarvester({
            substrate: this.substrate,
            session_id: sessionId,
        });
        this.synthesizer = new memory_synthesizer_1.MemorySynthesizer(this.substrate);
    }
    /**
     * Get harvester for event recording
     */
    getHarvester() {
        return this.harvester;
    }
    /**
     * Get synthesizer for trend analysis
     */
    getSynthesizer() {
        return this.synthesizer;
    }
    /**
     * Get substrate for direct queries
     */
    getSubstrate() {
        return this.substrate;
    }
    /**
     * Run full memory health check
     */
    async healthCheck() {
        const issues = [];
        try {
            const stats = this.substrate.getStats();
            if (stats.store_size_mb > 100) {
                issues.push(`Memory store exceeds 100MB (${stats.store_size_mb.toFixed(2)}MB). Archival should have run.`);
            }
            if (stats.total_events === 0) {
                issues.push("Memory store is empty. No events have been recorded.");
            }
            const status = issues.length === 0 ? "healthy" : issues.length > 2 ? "failed" : "degraded";
            return { status, stats, issues };
        }
        catch (err) {
            return {
                status: "failed",
                stats: null,
                issues: [err.message],
            };
        }
    }
    /**
     * Run scheduled weekly synthesis
     */
    async runWeeklySynthesis() {
        try {
            const summary = await this.synthesizer.synthesizeWeekly();
            console.log(`[WEEKLY] Generated summary: ${summary.event_count} events in ${summary.week_start} to ${summary.week_end}`);
            return summary;
        }
        catch (err) {
            console.error(`[WEEKLY] Synthesis failed:`, err);
            throw err;
        }
    }
    /**
     * Run scheduled monthly synthesis
     */
    async runMonthlySynthesis() {
        try {
            const summary = await this.synthesizer.synthesizeMonthly();
            console.log(`[MONTHLY] Generated summary: ${summary.aggregate_metrics.total_extractions} total extractions`);
            return summary;
        }
        catch (err) {
            console.error(`[MONTHLY] Synthesis failed:`, err);
            throw err;
        }
    }
}
exports.MemoryLayer = MemoryLayer;
/**
 * Singleton memory layer instance
 */
let globalMemoryLayer = null;
function initializeMemoryLayer(storePath) {
    if (!globalMemoryLayer) {
        globalMemoryLayer = new MemoryLayer(storePath);
    }
    return globalMemoryLayer;
}
function getMemoryLayer() {
    if (!globalMemoryLayer) {
        throw new Error("Memory layer not initialized. Call initializeMemoryLayer() first.");
    }
    return globalMemoryLayer;
}
//# sourceMappingURL=memory-integration.js.map