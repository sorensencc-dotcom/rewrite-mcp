"use strict";
/**
 * synthesizer-agent.ts
 * ARPS Phase 22.3 — Roadmap Synthesizer Agent
 * Rewrites fenced sections of CIC_MASTER_ROADMAP.md and CIC_PROJECT_STATE.md.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapSynthesizer = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class RoadmapSynthesizer {
    constructor(docsRoot) {
        this.docsRoot = docsRoot;
    }
    loadFile(relPath) {
        const fullPath = node_path_1.default.resolve(this.docsRoot, relPath);
        if (!node_fs_1.default.existsSync(fullPath)) {
            throw new Error(`[RoadmapSynthesizer] File not found: ${fullPath}`);
        }
        return node_fs_1.default.readFileSync(fullPath, "utf-8");
    }
    writeFile(relPath, content) {
        const fullPath = node_path_1.default.resolve(this.docsRoot, relPath);
        node_fs_1.default.writeFileSync(fullPath, content, "utf-8");
    }
    replaceFencedSection(content, fenceId, newBlock) {
        const startTag = `<!-- ARPS:${fenceId}:BEGIN -->`;
        const endTag = `<!-- ARPS:${fenceId}:END -->`;
        const escapedStart = startTag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const escapedEnd = endTag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const regex = new RegExp(`(${escapedStart})[\\s\\S]*?(${escapedEnd})`, "g");
        if (!regex.test(content)) {
            throw new Error(`[RoadmapSynthesizer] Fence tag not found in document: ${startTag} ... ${endTag}`);
        }
        return content.replace(regex, `$1\n${newBlock}\n$2`);
    }
    validateMarkdown(content) {
        // 1. Unbalanced backticks check
        const backticks = (content.match(/```/g) || []).length;
        if (backticks % 2 !== 0) {
            return { valid: false, reason: "Unbalanced code blocks (odd number of triple backticks)" };
        }
        // 2. Unbalanced inline code backticks check
        const singleBackticks = (content.match(/`/g) || []).length;
        if (singleBackticks % 2 !== 0) {
            return { valid: false, reason: "Unbalanced inline code markers (odd number of backticks)" };
        }
        // 3. Fenced table row count check inside health ledger if present
        if (content.includes("<!-- ARPS:HEALTH_LEDGER:BEGIN -->")) {
            const start = content.indexOf("<!-- ARPS:HEALTH_LEDGER:BEGIN -->");
            const end = content.indexOf("<!-- ARPS:HEALTH_LEDGER:END -->");
            const ledger = content.substring(start, end);
            const rows = ledger.split("\n").filter(l => l.trim().startsWith("|"));
            if (rows.length > 0 && rows.length < 3) { // Header, divider, and at least one data row
                return { valid: false, reason: "Health Ledger table must have a header, divider, and at least one data row" };
            }
        }
        return { valid: true };
    }
    buildPhase22Markdown(delta) {
        const findStatus = (nameKeywords) => {
            const comp = delta.components.find(c => nameKeywords.every(k => c.details.toLowerCase().includes(k.toLowerCase()) || c.name.toLowerCase().includes(k.toLowerCase())));
            if (!comp)
                return "PENDING";
            return comp.status;
        };
        const statusMap = (s) => {
            if (s === "COMPLETE")
                return "🟢 COMPLETE";
            if (s === "IN_PROGRESS")
                return "🟡 IN PROGRESS";
            return "🔴 PENDING";
        };
        const sandboxStatus = statusMap(findStatus(["prompt", "sandbox"]));
        const harvesterStatus = statusMap(findStatus(["harvester", "agent"]));
        const synthesizerStatus = statusMap(findStatus(["synthesizer", "agent"]));
        const pipelineStatus = statusMap(findStatus(["pipeline"]));
        return `- **Registry-Backed Prompt Sandbox**: Version system prompts and enforce immutability checks via \`registry.yaml\` with a cosine similarity floor and a 0.85 Jaccard fallback safety gate. (Status: ${sandboxStatus})
- **Roadmap Harvester Agent**: Extract structured deltas from git history log messages, task lists, and telemetry/test runs. (Status: ${harvesterStatus})
- **Roadmap Synthesizer Agent**: Safely rewrite fenced sections of \`CIC_MASTER_ROADMAP.md\` and \`CIC_PROJECT_STATE.md\` with markdown integrity validation. (Status: ${synthesizerStatus})
- **Closed-Loop CLI Pipeline**: Automate the harvesting → synthesizing → sandboxing → git commit/docs verification loop. (Status: ${pipelineStatus})`;
    }
    updateHealthLedger(oldLedgerText, delta) {
        const lines = oldLedgerText.split("\n");
        const updatedLines = lines.map(line => {
            if (!line.trim().startsWith("|"))
                return line;
            const parts = line.split("|");
            if (parts.length < 6)
                return line;
            const subsystem = parts[2].trim();
            // Match against delta components
            const match = delta.components.find(c => subsystem.toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes(subsystem.toLowerCase()) ||
                (subsystem.includes("Sandbox") && c.name.toLowerCase().includes("sandbox")) ||
                (subsystem.includes("Harvester") && c.name.toLowerCase().includes("harvester")));
            if (match) {
                let statusString = parts[4].trim();
                if (match.status === "COMPLETE")
                    statusString = "🟢 ACTIVE";
                if (match.status === "IN_PROGRESS")
                    statusString = "🟡 ACTIVE";
                if (match.status === "PENDING")
                    statusString = "🟡 PENDING";
                parts[4] = ` ${statusString} `;
                return parts.join("|");
            }
            return line;
        });
        return updatedLines.join("\n");
    }
    updateNextAscent(oldAscentText, delta) {
        const lines = oldAscentText.split("\n");
        const updatedLines = lines.map(line => {
            const match = line.match(/^([-\s]+)\[([ x\/])\]\s+(.*)$/);
            if (!match)
                return line;
            const prefix = match[1];
            const check = match[2];
            const text = match[3].trim();
            // Check if there is a completed component matching this text
            const deltaMatch = delta.components.find(c => text.toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes(text.toLowerCase()) ||
                (c.source === "tasks" && c.details === text));
            if (deltaMatch) {
                let newCheck = check;
                if (deltaMatch.status === "COMPLETE")
                    newCheck = "x";
                if (deltaMatch.status === "IN_PROGRESS")
                    newCheck = "/";
                if (deltaMatch.status === "PENDING")
                    newCheck = " ";
                return `${prefix}[${newCheck}] ${text}`;
            }
            return line;
        });
        return updatedLines.join("\n");
    }
    buildPhase23Markdown(delta) {
        return `## Phase 23 — CIC Memory Layer & Long‑Horizon Autonomy (MLA)

### Goal
Establish a durable, queryable memory substrate enabling CIC to reason over its own history, detect long-term patterns, and autonomously propose roadmap evolution.

### Milestones
- **23.1 — Memory Substrate Specification (MLA‑Spec)**
- **23.2 — Memory Harvester Agent (MLA‑Harvester)**
- **23.3 — Memory Synthesizer Agent (MLA‑Synthesizer)**
- **23.4 — Memory‑Aware Agents (MLA‑Integration)**
- **23.5 — Memory Query API (MLA‑API)**
- **23.6 — Memory Explorer UI (MLA‑UI)**
- **23.7 — Memory‑Driven Autonomy (MLA‑Autonomy)**`;
    }
    updateHealthLedgerPhase23(oldLedgerText, delta) {
        const lines = oldLedgerText.split("\n");
        const updatedLines = lines.map(line => {
            if (!line.trim().startsWith("|"))
                return line;
            const parts = line.split("|");
            if (parts.length < 4)
                return line;
            const component = parts[1].trim();
            if (component === "Component" || component.startsWith("---"))
                return line;
            const match = delta.components.find(c => component.toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes(component.toLowerCase()) ||
                (component.includes("Memory Substrate") && c.name.toLowerCase().includes("substrate")) ||
                (component.includes("Harvester") && c.name.toLowerCase().includes("harvester")) ||
                (component.includes("Synthesizer") && c.name.toLowerCase().includes("synthesizer")) ||
                (component.includes("Query API") && c.name.toLowerCase().includes("api")) ||
                (component.includes("Explorer UI") && c.name.toLowerCase().includes("explorer")) ||
                (component.includes("Autonomy") && c.name.toLowerCase().includes("autonomy")));
            if (match) {
                let statusString = parts[2].trim();
                if (match.status === "COMPLETE")
                    statusString = "COMPLETE";
                if (match.status === "IN_PROGRESS")
                    statusString = "IN_PROGRESS";
                if (match.status === "PENDING")
                    statusString = "PENDING";
                parts[2] = ` ${statusString} `;
                return parts.join("|");
            }
            return line;
        });
        return updatedLines.join("\n");
    }
    updateNextAscentPhase23(oldAscentText, delta) {
        const lines = oldAscentText.split("\n");
        const updatedLines = lines.map(line => {
            const match = line.match(/^([-\s]+)\[([ x\/])\]\s+(.*)$/);
            if (!match)
                return line;
            const prefix = match[1];
            const check = match[2];
            const text = match[3].trim();
            const deltaMatch = delta.components.find(c => text.toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes(text.toLowerCase()) ||
                (text.includes("Substrate") && c.name.toLowerCase().includes("substrate")) ||
                (text.includes("Harvester") && c.name.toLowerCase().includes("harvester")) ||
                (text.includes("Synthesizer") && c.name.toLowerCase().includes("synthesizer")) ||
                (text.includes("API") && c.name.toLowerCase().includes("api")) ||
                (text.includes("Explorer") && c.name.toLowerCase().includes("explorer")) ||
                (text.includes("Autonomy") && c.name.toLowerCase().includes("autonomy")));
            if (deltaMatch) {
                let newCheck = check;
                if (deltaMatch.status === "COMPLETE")
                    newCheck = "x";
                if (deltaMatch.status === "IN_PROGRESS")
                    newCheck = "/";
                if (deltaMatch.status === "PENDING")
                    newCheck = " ";
                return `${prefix}[${newCheck}] ${text}`;
            }
            return line;
        });
        return updatedLines.join("\n");
    }
    async run(delta, opts) {
        const modifiedFiles = [];
        // 1. Update CIC_MASTER_ROADMAP.md
        try {
            const roadmapRelPath = "cic/CIC_MASTER_ROADMAP.md";
            const roadmapContent = this.loadFile(roadmapRelPath);
            const newPhase22Block = this.buildPhase22Markdown(delta);
            const newPhase23Block = this.buildPhase23Markdown(delta);
            let updatedRoadmap = this.replaceFencedSection(roadmapContent, "PHASE_22", newPhase22Block);
            if (roadmapContent.includes("<!-- ARPS:PHASE_23:BEGIN -->")) {
                updatedRoadmap = this.replaceFencedSection(updatedRoadmap, "PHASE_23", newPhase23Block);
            }
            const validation = this.validateMarkdown(updatedRoadmap);
            if (!validation.valid) {
                throw new Error(`[RoadmapSynthesizer] Markdown validation failed for roadmap: ${validation.reason}`);
            }
            if (!opts.dryRun) {
                this.writeFile(roadmapRelPath, updatedRoadmap);
            }
            modifiedFiles.push(roadmapRelPath);
        }
        catch (err) {
            this.writeFailedPreview("CIC_MASTER_ROADMAP.md", err.message);
            throw err;
        }
        // 2. Update CIC_PROJECT_STATE.md
        try {
            const stateRelPath = "cic/CIC_PROJECT_STATE.md";
            const stateContent = this.loadFile(stateRelPath);
            // Re-fence replacing health ledger and next ascent
            let updatedState = stateContent;
            // Extract existing ledger
            const startLedger = stateContent.indexOf("<!-- ARPS:HEALTH_LEDGER:BEGIN -->");
            const endLedger = stateContent.indexOf("<!-- ARPS:HEALTH_LEDGER:END -->");
            if (startLedger !== -1 && endLedger !== -1) {
                const oldLedgerText = stateContent.substring(startLedger, endLedger);
                const newLedgerText = this.updateHealthLedger(oldLedgerText, delta);
                updatedState = this.replaceFencedSection(updatedState, "HEALTH_LEDGER", newLedgerText.replace("<!-- ARPS:HEALTH_LEDGER:BEGIN -->\n", ""));
            }
            // Extract existing ledger Phase 23
            const startLedger23 = updatedState.indexOf("<!-- ARPS:HEALTH_LEDGER_PHASE_23:BEGIN -->");
            const endLedger23 = updatedState.indexOf("<!-- ARPS:HEALTH_LEDGER_PHASE_23:END -->");
            if (startLedger23 !== -1 && endLedger23 !== -1) {
                const oldLedgerText23 = updatedState.substring(startLedger23, endLedger23);
                const newLedgerText23 = this.updateHealthLedgerPhase23(oldLedgerText23, delta);
                updatedState = this.replaceFencedSection(updatedState, "HEALTH_LEDGER_PHASE_23", newLedgerText23.replace("<!-- ARPS:HEALTH_LEDGER_PHASE_23:BEGIN -->\n", ""));
            }
            // Extract existing ascent
            const startAscent = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT:BEGIN -->");
            const endAscent = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT:END -->");
            if (startAscent !== -1 && endAscent !== -1) {
                const oldAscentText = updatedState.substring(startAscent, endAscent);
                const newAscentText = this.updateNextAscent(oldAscentText, delta);
                updatedState = this.replaceFencedSection(updatedState, "NEXT_ASCENT", newAscentText.replace("<!-- ARPS:NEXT_ASCENT:BEGIN -->\n", ""));
            }
            // Extract existing ascent Phase 23
            const startAscent23 = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT_PHASE_23:BEGIN -->");
            const endAscent23 = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT_PHASE_23:END -->");
            if (startAscent23 !== -1 && endAscent23 !== -1) {
                const oldAscentText23 = updatedState.substring(startAscent23, endAscent23);
                const newAscentText23 = this.updateNextAscentPhase23(oldAscentText23, delta);
                updatedState = this.replaceFencedSection(updatedState, "NEXT_ASCENT_PHASE_23", newAscentText23.replace("<!-- ARPS:NEXT_ASCENT_PHASE_23:BEGIN -->\n", ""));
            }
            const validation = this.validateMarkdown(updatedState);
            if (!validation.valid) {
                throw new Error(`[RoadmapSynthesizer] Markdown validation failed for state: ${validation.reason}`);
            }
            if (!opts.dryRun) {
                this.writeFile(stateRelPath, updatedState);
            }
            modifiedFiles.push(stateRelPath);
        }
        catch (err) {
            this.writeFailedPreview("CIC_PROJECT_STATE.md", err.message);
            throw err;
        }
        return modifiedFiles;
    }
    writeFailedPreview(filename, errorReason) {
        try {
            const artifactsDir = node_path_1.default.resolve(this.docsRoot, "../projects/cic/.artifacts/roadmap");
            if (!node_fs_1.default.existsSync(artifactsDir)) {
                node_fs_1.default.mkdirSync(artifactsDir, { recursive: true });
            }
            const failedPath = node_path_1.default.join(artifactsDir, `failed-${Date.now()}-${filename}`);
            node_fs_1.default.writeFileSync(failedPath, `# FAILED REWRITE PREVIEW: ${filename}\nReason: ${errorReason}\n`, "utf-8");
        }
        catch (e) {
            // Ignored
        }
    }
}
exports.RoadmapSynthesizer = RoadmapSynthesizer;
//# sourceMappingURL=synthesizer-agent.js.map