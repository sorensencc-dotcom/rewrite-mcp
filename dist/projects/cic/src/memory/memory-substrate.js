"use strict";
// File: projects/cic/src/memory/memory-substrate.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySubstrate = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class MemorySubstrate {
    constructor(ledgerPath) {
        this.ledgerPath = ledgerPath;
    }
    append(event) {
        const dir = node_path_1.default.dirname(this.ledgerPath);
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
        node_fs_1.default.appendFileSync(this.ledgerPath, JSON.stringify(event) + "\n", "utf8");
    }
    query(filter) {
        if (!node_fs_1.default.existsSync(this.ledgerPath)) {
            return [];
        }
        const content = node_fs_1.default.readFileSync(this.ledgerPath, "utf8");
        const lines = content.split("\n").filter(line => line.trim() !== "");
        const events = lines.map(line => JSON.parse(line));
        if (filter.type) {
            return events.filter(e => e.type === filter.type);
        }
        return events;
    }
    snapshot() {
        const events = this.query({});
        const summary = {};
        for (const e of events) {
            summary[e.type] = (summary[e.type] || 0) + 1;
        }
        return {
            totalEvents: events.length,
            types: summary,
            lastEvent: events.length > 0 ? events[events.length - 1] : null
        };
    }
}
exports.MemorySubstrate = MemorySubstrate;
//# sourceMappingURL=memory-substrate.js.map