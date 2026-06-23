"use strict";
// File: projects/cic/src/mee/mee-phase-spec-store.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeePhaseSpecStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mee_schema_js_1 = require("./mee-schema.js");
const DEFAULT_DATA = { phases: [] };
class FileMeePhaseSpecStore {
    constructor(baseDir = process.cwd()) {
        this.filePath = node_path_1.default.join(baseDir, "projects", "cic", "data", "mee", "phases.json");
    }
    ensureDir() {
        const dir = node_path_1.default.dirname(this.filePath);
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    loadFile() {
        try {
            if (!node_fs_1.default.existsSync(this.filePath)) {
                return DEFAULT_DATA;
            }
            const raw = node_fs_1.default.readFileSync(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed.phases))
                return DEFAULT_DATA;
            return parsed;
        }
        catch {
            return DEFAULT_DATA;
        }
    }
    saveFile(data) {
        this.ensureDir();
        node_fs_1.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }
    loadAll() {
        return this.loadFile().phases;
    }
    get(id) {
        return this.loadAll().find((p) => p.id === id) ?? null;
    }
    add(phase) {
        if (!(0, mee_schema_js_1.isMeePhaseSpec)(phase)) {
            throw new Error(`Invalid MeePhaseSpec schema: ${JSON.stringify(phase)}`);
        }
        const data = this.loadFile();
        data.phases = [...data.phases, phase];
        this.saveFile(data);
    }
    update(id, partial) {
        const data = this.loadFile();
        const idx = data.phases.findIndex((p) => p.id === id);
        if (idx === -1)
            return;
        const updated = { ...data.phases[idx], ...partial };
        if (!(0, mee_schema_js_1.isMeePhaseSpec)(updated)) {
            throw new Error(`Invalid MeePhaseSpec schema after update: ${JSON.stringify(updated)}`);
        }
        data.phases[idx] = updated;
        this.saveFile(data);
    }
    saveAll(phases) {
        if (!phases.every(mee_schema_js_1.isMeePhaseSpec)) {
            throw new Error("One or more phases do not match MeePhaseSpec schema.");
        }
        this.saveFile({ phases });
    }
}
exports.FileMeePhaseSpecStore = FileMeePhaseSpecStore;
//# sourceMappingURL=mee-phase-spec-store.js.map