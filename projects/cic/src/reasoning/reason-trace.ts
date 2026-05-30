/**
 * projects/cic/src/reasoning/reason-trace.ts
 * Manages auditing, serialization, loading, and structural checking of reasoning traces.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RetrievalPlan } from "./retrieval-planner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultTraceDir = path.resolve(__dirname, "../../data/traces");

export interface Contradiction {
  claimA: string;
  claimB: string;
  severity: "high" | "low";
  evidenceIds: string[];
}

export interface ReasonTrace {
  traceId: string;
  query: string;
  plan: RetrievalPlan;
  evidenceEvaluated: {
    evidenceId: string;
    type: string;
    score: number;
    action: "used" | "discarded";
    reason: string;
  }[];
  contradictionsDetected: Contradiction[];
  stageLatenciesMs: Record<string, number>;
  finalAnswer: string;
  confidence: "high" | "medium" | "low";
  isContested: boolean;
  timestamp: string;
}

export class ReasonTraceManager {
  save(trace: ReasonTrace, dirPath: string = defaultTraceDir): string {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const filePath = path.join(dirPath, `${trace.traceId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(trace, null, 2), "utf-8");
      return filePath;
    } catch (err: any) {
      console.error(`[ReasonTraceManager] Failed to save trace ${trace.traceId}:`, err.message);
      return "";
    }
  }

  load(traceId: string, dirPath: string = defaultTraceDir): ReasonTrace | null {
    try {
      const filePath = path.join(dirPath, `${traceId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as ReasonTrace;
    } catch (err: any) {
      console.error(`[ReasonTraceManager] Failed to load trace ${traceId}:`, err.message);
      return null;
    }
  }

  listTraces(dirPath: string = defaultTraceDir): string[] {
    try {
      if (!fs.existsSync(dirPath)) return [];
      return fs.readdirSync(dirPath).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
    } catch {
      return [];
    }
  }
}

export const reasonTraceManager = new ReasonTraceManager();
