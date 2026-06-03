// File: projects/cic/src/mee/mee-autonomous-store.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { MeeAutonomousJob } from "./mee-schema.js";
import { MeeAutonomousJobStore } from "./mee-autonomous-engine.js";

export class FileMeeAutonomousJobStore implements MeeAutonomousJobStore {
  constructor(public readonly baseDir: string) {}

  public jobsFile() {
    return path.join(this.baseDir, "mee-autonomous-jobs.json");
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

  save(job: MeeAutonomousJob): void {
    const file = this.jobsFile();
    const jobs = this.load<MeeAutonomousJob>(file);
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.push(job);
    }
    this.saveAll(file, jobs);
  }

  get(id: string): MeeAutonomousJob | undefined {
    const jobs = this.load<MeeAutonomousJob>(this.jobsFile());
    return jobs.find((j) => j.id === id);
  }

  list(): MeeAutonomousJob[] {
    return this.load<MeeAutonomousJob>(this.jobsFile());
  }
}
