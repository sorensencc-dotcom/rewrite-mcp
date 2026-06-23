"use strict";
/**
 * harvester-agent.ts
 * ARPS Phase 22.2 — Roadmap Harvester Agent
 * Extracts deltas from git logs, tasks, telemetry, and test outputs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapHarvester = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
class RoadmapHarvester {
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    async parseGit() {
        const deltas = [];
        try {
            // Fetch last 30 conventional commits
            const gitLog = (0, node_child_process_1.execSync)("git log -n 30 --oneline", {
                cwd: this.repoRoot,
                stdio: ["ignore", "pipe", "ignore"]
            }).toString();
            const lines = gitLog.split("\n");
            for (const line of lines) {
                const match = line.match(/^[a-f0-9]+\s+\[([^\]]+)\]\s+(.*)$/i);
                if (match) {
                    const prefix = match[1].toLowerCase();
                    const message = match[2];
                    let status = "COMPLETE";
                    if (message.includes("wip") || message.includes("draft") || message.includes("scaffold")) {
                        status = "IN_PROGRESS";
                    }
                    deltas.push({
                        name: `Git: ${message.split(" ")[0] || "Update"}`,
                        status,
                        details: `[${prefix}] ${message}`,
                        source: "git"
                    });
                }
            }
        }
        catch (err) {
            // Git command failed or not a repo (e.g. during test mock)
        }
        return deltas;
    }
    async parseTasks() {
        const deltas = [];
        const taskPaths = [
            node_path_1.default.join(this.repoRoot, "task.md"),
            node_path_1.default.join(this.repoRoot, "projects/cic/task.md")
        ];
        for (const taskPath of taskPaths) {
            if (node_fs_1.default.existsSync(taskPath)) {
                const content = node_fs_1.default.readFileSync(taskPath, "utf-8");
                const lines = content.split("\n");
                for (const line of lines) {
                    const match = line.match(/^-\s+\[([ x\/])\]\s+(.*)$/);
                    if (match) {
                        const check = match[1];
                        const text = match[2].trim();
                        let status = "PENDING";
                        if (check === "x")
                            status = "COMPLETE";
                        if (check === "/")
                            status = "IN_PROGRESS";
                        deltas.push({
                            name: text.substring(0, 30),
                            status,
                            details: text,
                            source: "tasks"
                        });
                    }
                }
            }
        }
        return deltas;
    }
    async parseTelemetry() {
        const deltas = [];
        // Read the telemetry or test summary logs if they exist
        const testLogsPath = node_path_1.default.join(this.repoRoot, "projects/cic/data/test-results.json");
        if (node_fs_1.default.existsSync(testLogsPath)) {
            try {
                const data = JSON.parse(node_fs_1.default.readFileSync(testLogsPath, "utf-8"));
                if (data.numFailedTests === 0) {
                    deltas.push({
                        name: "Telemetry: Unit Tests",
                        status: "COMPLETE",
                        details: `All ${data.numTotalTests} tests passing`,
                        source: "telemetry"
                    });
                }
                else {
                    deltas.push({
                        name: "Telemetry: Unit Tests",
                        status: "IN_PROGRESS",
                        details: `${data.numFailedTests} / ${data.numTotalTests} tests failing`,
                        source: "telemetry"
                    });
                }
            }
            catch (e) {
                // Ignored
            }
        }
        return deltas;
    }
    async run() {
        const gitDeltas = await this.parseGit();
        const taskDeltas = await this.parseTasks();
        const telemetryDeltas = await this.parseTelemetry();
        const components = [...gitDeltas, ...taskDeltas, ...telemetryDeltas];
        // Compute completions: components that became complete in tasks/git recently
        const completions = components
            .filter(c => c.status === "COMPLETE")
            .map(c => c.name);
        // Compute gaps: tasks that are still pending
        const gaps = components
            .filter(c => c.status === "PENDING")
            .map(c => c.details);
        const delta = {
            components,
            completions,
            gaps,
            timestamp: new Date().toISOString()
        };
        // Save delta file under projects/cic/.artifacts/roadmap/
        const artifactsDir = node_path_1.default.join(this.repoRoot, "projects/cic/.artifacts/roadmap");
        if (!node_fs_1.default.existsSync(artifactsDir)) {
            node_fs_1.default.mkdirSync(artifactsDir, { recursive: true });
        }
        const cleanTimestamp = delta.timestamp.replace(/[:.]/g, "-");
        const deltaPath = node_path_1.default.join(artifactsDir, `delta-${cleanTimestamp}.json`);
        node_fs_1.default.writeFileSync(deltaPath, JSON.stringify(delta, null, 2), "utf-8");
        return delta;
    }
}
exports.RoadmapHarvester = RoadmapHarvester;
//# sourceMappingURL=harvester-agent.js.map