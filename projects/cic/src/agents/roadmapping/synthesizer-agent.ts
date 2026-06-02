/**
 * synthesizer-agent.ts
 * ARPS Phase 22.3 — Roadmap Synthesizer Agent
 * Rewrites fenced sections of CIC_MASTER_ROADMAP.md and CIC_PROJECT_STATE.md.
 */

import fs from "node:fs";
import path from "node:path";
import { RoadmapDelta, RoadmapComponentDelta } from "./harvester-agent.js";

export class RoadmapSynthesizer {
  constructor(private docsRoot: string) {}

  private loadFile(relPath: string): string {
    const fullPath = path.resolve(this.docsRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[RoadmapSynthesizer] File not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, "utf-8");
  }

  private writeFile(relPath: string, content: string): void {
    const fullPath = path.resolve(this.docsRoot, relPath);
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  replaceFencedSection(
    content: string,
    fenceId: string,
    newBlock: string
  ): string {
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

  validateMarkdown(content: string): { valid: boolean; reason?: string } {
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

  buildPhase22Markdown(delta: RoadmapDelta): string {
    const findStatus = (nameKeywords: string[]) => {
      const comp = delta.components.find(c =>
        nameKeywords.every(k => c.details.toLowerCase().includes(k.toLowerCase()) || c.name.toLowerCase().includes(k.toLowerCase()))
      );
      if (!comp) return "PENDING";
      return comp.status;
    };

    const statusMap = (s: string) => {
      if (s === "COMPLETE") return "🟢 COMPLETE";
      if (s === "IN_PROGRESS") return "🟡 IN PROGRESS";
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

  updateHealthLedger(oldLedgerText: string, delta: RoadmapDelta): string {
    const lines = oldLedgerText.split("\n");
    const updatedLines = lines.map(line => {
      if (!line.trim().startsWith("|")) return line;
      const parts = line.split("|");
      if (parts.length < 6) return line;

      const subsystem = parts[2].trim();
      
      // Match against delta components
      const match = delta.components.find(c => 
        subsystem.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(subsystem.toLowerCase()) ||
        (subsystem.includes("Sandbox") && c.name.toLowerCase().includes("sandbox")) ||
        (subsystem.includes("Harvester") && c.name.toLowerCase().includes("harvester"))
      );

      if (match) {
        let statusString = parts[4].trim();
        if (match.status === "COMPLETE") statusString = "🟢 ACTIVE";
        if (match.status === "IN_PROGRESS") statusString = "🟡 ACTIVE";
        if (match.status === "PENDING") statusString = "🟡 PENDING";
        parts[4] = ` ${statusString} `;
        return parts.join("|");
      }
      return line;
    });
    return updatedLines.join("\n");
  }

  updateNextAscent(oldAscentText: string, delta: RoadmapDelta): string {
    const lines = oldAscentText.split("\n");
    const updatedLines = lines.map(line => {
      const match = line.match(/^([-\s]+)\[([ x\/])\]\s+(.*)$/);
      if (!match) return line;

      const prefix = match[1];
      const check = match[2];
      const text = match[3].trim();

      // Check if there is a completed component matching this text
      const deltaMatch = delta.components.find(c => 
        text.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(text.toLowerCase()) ||
        (c.source === "tasks" && c.details === text)
      );

      if (deltaMatch) {
        let newCheck = check;
        if (deltaMatch.status === "COMPLETE") newCheck = "x";
        if (deltaMatch.status === "IN_PROGRESS") newCheck = "/";
        if (deltaMatch.status === "PENDING") newCheck = " ";
        return `${prefix}[${newCheck}] ${text}`;
      }
      return line;
    });
    return updatedLines.join("\n");
  }

  async run(delta: RoadmapDelta, opts: { dryRun: boolean }): Promise<string[]> {
    const modifiedFiles: string[] = [];

    // 1. Update CIC_MASTER_ROADMAP.md
    try {
      const roadmapRelPath = "cic/CIC_MASTER_ROADMAP.md";
      const roadmapContent = this.loadFile(roadmapRelPath);
      const newPhase22Block = this.buildPhase22Markdown(delta);
      const updatedRoadmap = this.replaceFencedSection(roadmapContent, "PHASE_22", newPhase22Block);

      const validation = this.validateMarkdown(updatedRoadmap);
      if (!validation.valid) {
        throw new Error(`[RoadmapSynthesizer] Markdown validation failed for roadmap: ${validation.reason}`);
      }

      if (!opts.dryRun) {
        this.writeFile(roadmapRelPath, updatedRoadmap);
      }
      modifiedFiles.push(roadmapRelPath);
    } catch (err: any) {
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

      // Extract existing ascent
      const startAscent = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT:BEGIN -->");
      const endAscent = updatedState.indexOf("<!-- ARPS:NEXT_ASCENT:END -->");
      if (startAscent !== -1 && endAscent !== -1) {
        const oldAscentText = updatedState.substring(startAscent, endAscent);
        const newAscentText = this.updateNextAscent(oldAscentText, delta);
        updatedState = this.replaceFencedSection(updatedState, "NEXT_ASCENT", newAscentText.replace("<!-- ARPS:NEXT_ASCENT:BEGIN -->\n", ""));
      }

      const validation = this.validateMarkdown(updatedState);
      if (!validation.valid) {
        throw new Error(`[RoadmapSynthesizer] Markdown validation failed for state: ${validation.reason}`);
      }

      if (!opts.dryRun) {
        this.writeFile(stateRelPath, updatedState);
      }
      modifiedFiles.push(stateRelPath);
    } catch (err: any) {
      this.writeFailedPreview("CIC_PROJECT_STATE.md", err.message);
      throw err;
    }

    return modifiedFiles;
  }

  private writeFailedPreview(filename: string, errorReason: string): void {
    try {
      const artifactsDir = path.resolve(this.docsRoot, "../projects/cic/.artifacts/roadmap");
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }
      const failedPath = path.join(artifactsDir, `failed-${Date.now()}-${filename}`);
      fs.writeFileSync(failedPath, `# FAILED REWRITE PREVIEW: ${filename}\nReason: ${errorReason}\n`, "utf-8");
    } catch (e) {
      // Ignored
    }
  }
}
