"use strict";
// File: projects/cic/src/mee/mee-meta-rule-store.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeeMetaRuleStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mee_schema_js_1 = require("./mee-schema.js");
const DEFAULT_DATA = { rules: [] };
class FileMeeMetaRuleStore {
    constructor(baseDir = process.cwd()) {
        this.filePath = node_path_1.default.join(baseDir, "projects", "cic", "data", "mee", "meta-rules.json");
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
            if (!Array.isArray(parsed.rules))
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
        return this.loadFile().rules;
    }
    get(id) {
        return this.loadAll().find((r) => r.id === id) ?? null;
    }
    add(rule) {
        if (!(0, mee_schema_js_1.isMeeMetaRule)(rule)) {
            throw new Error(`Invalid MeeMetaRule schema: ${JSON.stringify(rule)}`);
        }
        const data = this.loadFile();
        data.rules = [...data.rules, rule];
        this.saveFile(data);
    }
    update(id, partial) {
        const data = this.loadFile();
        const idx = data.rules.findIndex((r) => r.id === id);
        if (idx === -1)
            return;
        const updated = { ...data.rules[idx], ...partial };
        if (!(0, mee_schema_js_1.isMeeMetaRule)(updated)) {
            throw new Error(`Invalid MeeMetaRule schema after update: ${JSON.stringify(updated)}`);
        }
        data.rules[idx] = updated;
        this.saveFile(data);
    }
    saveAll(rules) {
        if (!rules.every(mee_schema_js_1.isMeeMetaRule)) {
            throw new Error("One or more rules do not match MeeMetaRule schema.");
        }
        this.saveFile({ rules });
    }
}
exports.FileMeeMetaRuleStore = FileMeeMetaRuleStore;
//# sourceMappingURL=mee-meta-rule-store.js.map