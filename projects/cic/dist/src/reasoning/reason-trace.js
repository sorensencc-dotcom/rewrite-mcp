/**
 * projects/cic/src/reasoning/reason-trace.ts
 * Manages auditing, serialization, loading, and structural checking of reasoning traces.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultTraceDir = path.resolve(__dirname, "../../data/traces");
export class ReasonTraceManager {
    save(trace, dirPath = defaultTraceDir) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            const filePath = path.join(dirPath, `${trace.traceId}.json`);
            fs.writeFileSync(filePath, JSON.stringify(trace, null, 2), "utf-8");
            return filePath;
        }
        catch (err) {
            console.error(`[ReasonTraceManager] Failed to save trace ${trace.traceId}:`, err.message);
            return "";
        }
    }
    load(traceId, dirPath = defaultTraceDir) {
        try {
            const filePath = path.join(dirPath, `${traceId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const raw = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(raw);
        }
        catch (err) {
            console.error(`[ReasonTraceManager] Failed to load trace ${traceId}:`, err.message);
            return null;
        }
    }
    listTraces(dirPath = defaultTraceDir) {
        try {
            if (!fs.existsSync(dirPath))
                return [];
            return fs.readdirSync(dirPath).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
        }
        catch {
            return [];
        }
    }
}
export const reasonTraceManager = new ReasonTraceManager();
//# sourceMappingURL=reason-trace.js.map