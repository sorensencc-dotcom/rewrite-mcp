"use strict";
/**
 * projects/cic/src/reasoning/reason-trace.ts
 * Manages auditing, serialization, loading, and structural checking of reasoning traces.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reasonTraceManager = exports.ReasonTraceManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const defaultTraceDir = path_1.default.resolve(__dirname, "../../data/traces");
class ReasonTraceManager {
    save(trace, dirPath = defaultTraceDir) {
        try {
            if (!fs_1.default.existsSync(dirPath)) {
                fs_1.default.mkdirSync(dirPath, { recursive: true });
            }
            const filePath = path_1.default.join(dirPath, `${trace.traceId}.json`);
            fs_1.default.writeFileSync(filePath, JSON.stringify(trace, null, 2), "utf-8");
            return filePath;
        }
        catch (err) {
            console.error(`[ReasonTraceManager] Failed to save trace ${trace.traceId}:`, err.message);
            return "";
        }
    }
    load(traceId, dirPath = defaultTraceDir) {
        try {
            const filePath = path_1.default.join(dirPath, `${traceId}.json`);
            if (!fs_1.default.existsSync(filePath)) {
                return null;
            }
            const raw = fs_1.default.readFileSync(filePath, "utf-8");
            return JSON.parse(raw);
        }
        catch (err) {
            console.error(`[ReasonTraceManager] Failed to load trace ${traceId}:`, err.message);
            return null;
        }
    }
    listTraces(dirPath = defaultTraceDir) {
        try {
            if (!fs_1.default.existsSync(dirPath))
                return [];
            return fs_1.default.readdirSync(dirPath).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
        }
        catch {
            return [];
        }
    }
}
exports.ReasonTraceManager = ReasonTraceManager;
exports.reasonTraceManager = new ReasonTraceManager();
//# sourceMappingURL=reason-trace.js.map