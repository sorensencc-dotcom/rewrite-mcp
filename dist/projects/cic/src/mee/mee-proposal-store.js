"use strict";
// File: projects/cic/src/mee/mee-proposal-store.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeProposalStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_DATA = { proposals: [] };
class MeeProposalStore {
    constructor(baseDir = process.cwd()) {
        this.filePath = node_path_1.default.join(baseDir, "projects", "cic", "data", "mee", "proposals.json");
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
            if (!Array.isArray(parsed.proposals))
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
        return this.loadFile().proposals;
    }
    get(id) {
        return this.loadAll().find((p) => p.id === id) ?? null;
    }
    add(proposal) {
        const data = this.loadFile();
        data.proposals = [...data.proposals, proposal];
        this.saveFile(data);
    }
    update(id, partial) {
        const data = this.loadFile();
        const idx = data.proposals.findIndex((p) => p.id === id);
        if (idx === -1)
            return;
        data.proposals[idx] = { ...data.proposals[idx], ...partial };
        this.saveFile(data);
    }
    saveAll(proposals) {
        this.saveFile({ proposals });
    }
}
exports.MeeProposalStore = MeeProposalStore;
//# sourceMappingURL=mee-proposal-store.js.map