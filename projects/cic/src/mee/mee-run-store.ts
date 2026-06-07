// File: projects/cic/src/mee/mee-run-store.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { MeeRun, MeeCheckpoint } from "./mee-schema.js";
import { MeeRunStore } from "./mee-run-engine.js";

export class FileMeeRunStore implements MeeRunStore {
  constructor(public readonly baseDir: string) {}

  public runsFile() {
    return path.join(this.baseDir, "mee-runs.json");
  }

  public cpsFile() {
    return path.join(this.baseDir, "mee-checkpoints.json");
  }

  public load<T>(file: string): T[] {
    if (!fs.existsSync(file)) return [];
    try {
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  private saveAll<T>(file: string, items: T[]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
  }

  saveRun(run: MeeRun): void {
    const file = this.runsFile();
    const runs = this.load<MeeRun>(file);
    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      runs[idx] = run;
    } else {
      runs.push(run);
    }
    this.saveAll(file, runs);
  }

  getRun(id: string): MeeRun | undefined {
    const runs = this.load<MeeRun>(this.runsFile());
    return runs.find((r) => r.id === id);
  }

  listRuns(): MeeRun[] {
    return this.load<MeeRun>(this.runsFile());
  }

  saveCheckpoint(cp: MeeCheckpoint): void {
    const file = this.cpsFile();
    const cps = this.load<MeeCheckpoint>(file);
    cps.push(cp);
    this.saveAll(file, cps);
  }

  getCheckpoints(runId: string): MeeCheckpoint[] {
    const cps = this.load<MeeCheckpoint>(this.cpsFile());
    return cps.filter((c) => c.runId === runId);
  }
}
