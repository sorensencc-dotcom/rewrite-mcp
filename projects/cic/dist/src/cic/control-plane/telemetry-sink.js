import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class NoopTelemetrySink {
    async recordSkill() { }
    async recordInstinct() { }
    async enrichInstinct() { }
    async querySkills() { return []; }
    async queryInstincts() { return []; }
    async clear() { }
}
export class DefaultTelemetrySink {
    constructor(logDir) {
        this.skillsStore = [];
        this.instinctsStore = [];
        this.logDir = logDir || path.resolve(__dirname, "../../../data/telemetry");
    }
    ensureDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    async recordSkill(event) {
        this.skillsStore.push(event);
        try {
            this.ensureDir();
            const filePath = path.join(this.logDir, "skills.jsonl");
            fs.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
        }
        catch (err) {
            console.error(`[TelemetrySink] Failed to write skill log:`, err.message);
        }
    }
    async recordInstinct(event) {
        this.instinctsStore.push(event);
        try {
            this.ensureDir();
            const filePath = path.join(this.logDir, "instincts.jsonl");
            fs.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
        }
        catch (err) {
            console.error(`[TelemetrySink] Failed to write instinct log:`, err.message);
        }
    }
    async enrichInstinct(runId, enrichment) {
        this.instinctsStore = this.instinctsStore.map(e => {
            if (e.runId === runId) {
                return { ...e, ...enrichment };
            }
            return e;
        });
        try {
            this.ensureDir();
            const filePath = path.join(this.logDir, "instincts.jsonl");
            const content = this.instinctsStore.map(e => JSON.stringify(e)).join("\n") + "\n";
            fs.writeFileSync(filePath, content, "utf-8");
        }
        catch (err) {
            console.error(`[TelemetrySink] Failed to write enriched instinct log:`, err.message);
        }
    }
    async querySkills(filter = {}) {
        let result = [...this.skillsStore];
        if (filter.pipeline)
            result = result.filter(e => e.pipeline === filter.pipeline);
        if (filter.skillName)
            result = result.filter(e => e.skillName === filter.skillName);
        if (filter.tenantId)
            result = result.filter(e => e.tenantId === filter.tenantId);
        if (filter.region)
            result = result.filter(e => e.region === filter.region);
        const limit = filter.limit ? Number(filter.limit) : 100;
        return result.slice(0, limit);
    }
    async queryInstincts(filter = {}) {
        let result = [...this.instinctsStore];
        if (filter.pipeline)
            result = result.filter(e => e.pipeline === filter.pipeline);
        if (filter.instinctName)
            result = result.filter(e => e.instinctName === filter.instinctName);
        if (filter.tenantId)
            result = result.filter(e => e.tenantId === filter.tenantId);
        if (filter.region)
            result = result.filter(e => e.region === filter.region);
        const limit = filter.limit ? Number(filter.limit) : 100;
        return result.slice(0, limit);
    }
    async clear() {
        this.skillsStore = [];
        this.instinctsStore = [];
        try {
            const skillsPath = path.join(this.logDir, "skills.jsonl");
            const instinctsPath = path.join(this.logDir, "instincts.jsonl");
            if (fs.existsSync(skillsPath))
                fs.unlinkSync(skillsPath);
            if (fs.existsSync(instinctsPath))
                fs.unlinkSync(instinctsPath);
        }
        catch (err) {
            console.warn(`[TelemetrySink] Failed to delete logs during clear:`, err.message);
        }
    }
}
let activeSink = new DefaultTelemetrySink();
export function setTelemetrySink(sink) {
    activeSink = sink;
}
export function getTelemetrySink() {
    return activeSink;
}
//# sourceMappingURL=telemetry-sink.js.map