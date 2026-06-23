"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTelemetrySink = exports.NoopTelemetrySink = void 0;
exports.setTelemetrySink = setTelemetrySink;
exports.getTelemetrySink = getTelemetrySink;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
class NoopTelemetrySink {
    async recordSkill() { }
    async recordInstinct() { }
    async enrichInstinct() { }
    async querySkills() { return []; }
    async queryInstincts() { return []; }
    async clear() { }
}
exports.NoopTelemetrySink = NoopTelemetrySink;
class DefaultTelemetrySink {
    constructor(logDir) {
        this.skillsStore = [];
        this.instinctsStore = [];
        this.logDir = logDir || path_1.default.resolve(__dirname, "../../../data/telemetry");
    }
    ensureDir() {
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    async recordSkill(event) {
        this.skillsStore.push(event);
        try {
            this.ensureDir();
            const filePath = path_1.default.join(this.logDir, "skills.jsonl");
            fs_1.default.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
        }
        catch (err) {
            console.error(`[TelemetrySink] Failed to write skill log:`, err.message);
        }
    }
    async recordInstinct(event) {
        this.instinctsStore.push(event);
        try {
            this.ensureDir();
            const filePath = path_1.default.join(this.logDir, "instincts.jsonl");
            fs_1.default.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
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
            const filePath = path_1.default.join(this.logDir, "instincts.jsonl");
            const content = this.instinctsStore.map(e => JSON.stringify(e)).join("\n") + "\n";
            fs_1.default.writeFileSync(filePath, content, "utf-8");
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
            const skillsPath = path_1.default.join(this.logDir, "skills.jsonl");
            const instinctsPath = path_1.default.join(this.logDir, "instincts.jsonl");
            if (fs_1.default.existsSync(skillsPath))
                fs_1.default.unlinkSync(skillsPath);
            if (fs_1.default.existsSync(instinctsPath))
                fs_1.default.unlinkSync(instinctsPath);
        }
        catch (err) {
            console.warn(`[TelemetrySink] Failed to delete logs during clear:`, err.message);
        }
    }
}
exports.DefaultTelemetrySink = DefaultTelemetrySink;
let activeSink = new DefaultTelemetrySink();
function setTelemetrySink(sink) {
    activeSink = sink;
}
function getTelemetrySink() {
    return activeSink;
}
//# sourceMappingURL=telemetry-sink.js.map