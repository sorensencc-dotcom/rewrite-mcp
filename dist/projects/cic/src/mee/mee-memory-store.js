"use strict";
// File: projects/cic/src/mee/mee-memory-store.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeeMemoryStore = exports.InMemoryMeeMemoryStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class InMemoryMeeMemoryStore {
    constructor() {
        this.items = new Map();
    }
    add(item) {
        this.items.set(item.id, item);
    }
    get(id) {
        return this.items.get(id);
    }
    queryByTags(tags) {
        const set = new Set(tags);
        return Array.from(this.items.values()).filter((i) => i.tags.some((t) => set.has(t)));
    }
    queryByJob(jobId) {
        return Array.from(this.items.values()).filter((i) => i.jobId === jobId);
    }
}
exports.InMemoryMeeMemoryStore = InMemoryMeeMemoryStore;
class FileMeeMemoryStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    memoryFile() {
        return node_path_1.default.join(this.baseDir, "mee-memory.json");
    }
    load() {
        if (!node_fs_1.default.existsSync(this.memoryFile()))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(this.memoryFile(), "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveAll(items) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.memoryFile()), { recursive: true });
        node_fs_1.default.writeFileSync(this.memoryFile(), JSON.stringify(items, null, 2), "utf8");
    }
    add(item) {
        const items = this.load();
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
            items[idx] = item;
        }
        else {
            items.push(item);
        }
        this.saveAll(items);
    }
    get(id) {
        return this.load().find((i) => i.id === id);
    }
    queryByTags(tags) {
        const set = new Set(tags);
        return this.load().filter((i) => i.tags.some((t) => set.has(t)));
    }
    queryByJob(jobId) {
        return this.load().filter((i) => i.jobId === jobId);
    }
}
exports.FileMeeMemoryStore = FileMeeMemoryStore;
//# sourceMappingURL=mee-memory-store.js.map