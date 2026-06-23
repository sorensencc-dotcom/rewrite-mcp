"use strict";
// File: projects/cic/src/mee/mee-run-store.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeeRunStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class FileMeeRunStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    runsFile() {
        return node_path_1.default.join(this.baseDir, "mee-runs.json");
    }
    cpsFile() {
        return node_path_1.default.join(this.baseDir, "mee-checkpoints.json");
    }
    load(file) {
        if (!node_fs_1.default.existsSync(file))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(file, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveAll(file, items) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        node_fs_1.default.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
    }
    saveRun(run) {
        const file = this.runsFile();
        const runs = this.load(file);
        const idx = runs.findIndex((r) => r.id === run.id);
        if (idx >= 0) {
            runs[idx] = run;
        }
        else {
            runs.push(run);
        }
        this.saveAll(file, runs);
    }
    getRun(id) {
        const runs = this.load(this.runsFile());
        return runs.find((r) => r.id === id);
    }
    listRuns() {
        return this.load(this.runsFile());
    }
    saveCheckpoint(cp) {
        const file = this.cpsFile();
        const cps = this.load(file);
        cps.push(cp);
        this.saveAll(file, cps);
    }
    getCheckpoints(runId) {
        const cps = this.load(this.cpsFile());
        return cps.filter((c) => c.runId === runId);
    }
}
exports.FileMeeRunStore = FileMeeRunStore;
//# sourceMappingURL=mee-run-store.js.map