/**
 * harvester-agent.ts
 * ARPS Phase 22.2 — Roadmap Harvester Agent
 * Extracts deltas from git logs, tasks, telemetry, and test outputs.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface RoadmapComponentDelta {
  name: string;
  status: string; // "PENDING" | "IN_PROGRESS" | "COMPLETE"
  details: string;
  source: string;
}

export interface RoadmapDelta {
  components: RoadmapComponentDelta[];
  completions: string[];
  gaps: string[];
  timestamp: string;
}

export class RoadmapHarvester {
  constructor(private repoRoot: string) {}

  async parseGit(): Promise<RoadmapComponentDelta[]> {
    const deltas: RoadmapComponentDelta[] = [];
    try {
      // Fetch last 30 conventional commits
      const gitLog = execSync("git log -n 30 --oneline", {
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
    } catch (err) {
      // Git command failed or not a repo (e.g. during test mock)
    }
    return deltas;
  }

  async parseTasks(): Promise<RoadmapComponentDelta[]> {
    const deltas: RoadmapComponentDelta[] = [];
    const taskPaths = [
      path.join(this.repoRoot, "task.md"),
      path.join(this.repoRoot, "projects/cic/task.md")
    ];

    for (const taskPath of taskPaths) {
      if (fs.existsSync(taskPath)) {
        const content = fs.readFileSync(taskPath, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          const match = line.match(/^-\s+\[([ x\/])\]\s+(.*)$/);
          if (match) {
            const check = match[1];
            const text = match[2].trim();
            let status = "PENDING";
            if (check === "x") status = "COMPLETE";
            if (check === "/") status = "IN_PROGRESS";

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

  async parseTelemetry(): Promise<RoadmapComponentDelta[]> {
    const deltas: RoadmapComponentDelta[] = [];
    // Read the telemetry or test summary logs if they exist
    const testLogsPath = path.join(this.repoRoot, "projects/cic/data/test-results.json");
    if (fs.existsSync(testLogsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(testLogsPath, "utf-8"));
        if (data.numFailedTests === 0) {
          deltas.push({
            name: "Telemetry: Unit Tests",
            status: "COMPLETE",
            details: `All ${data.numTotalTests} tests passing`,
            source: "telemetry"
          });
        } else {
          deltas.push({
            name: "Telemetry: Unit Tests",
            status: "IN_PROGRESS",
            details: `${data.numFailedTests} / ${data.numTotalTests} tests failing`,
            source: "telemetry"
          });
        }
      } catch (e) {
        // Ignored
      }
    }
    return deltas;
  }

  async run(): Promise<RoadmapDelta> {
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

    const delta: RoadmapDelta = {
      components,
      completions,
      gaps,
      timestamp: new Date().toISOString()
    };

    // Save delta file under projects/cic/.artifacts/roadmap/
    const artifactsDir = path.join(this.repoRoot, "projects/cic/.artifacts/roadmap");
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    const cleanTimestamp = delta.timestamp.replace(/[:.]/g, "-");
    const deltaPath = path.join(artifactsDir, `delta-${cleanTimestamp}.json`);
    fs.writeFileSync(deltaPath, JSON.stringify(delta, null, 2), "utf-8");

    return delta;
  }
}
