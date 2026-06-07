// File: projects/cic/src/mee/mee-autonomous-store.ts | Date: 2026-06-04 | v1.1.0

import fs from "node:fs";
import path from "node:path";
import { MeeAutonomousJob, MeeRunFailureContext, MeeHealingPlan } from "./mee-schema.js";
import { MeeAutonomousJobStore, MeeRunFailureContextStore, MeeHealingPlanStore } from "./mee-autonomous-engine.js";

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

export class FileMeeRunFailureContextStore implements MeeRunFailureContextStore {
  constructor(public readonly baseDir: string) {}

  public failuresFile() {
    return path.join(this.baseDir, "mee-run-failures.json");
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

  save(context: MeeRunFailureContext): void {
    const file = this.failuresFile();
    const failures = this.load<MeeRunFailureContext>(file);
    const idx = failures.findIndex((f) => f.runId === context.runId);
    if (idx >= 0) {
      failures[idx] = context;
    } else {
      failures.push(context);
    }
    this.saveAll(file, failures);
  }

  get(runId: string): MeeRunFailureContext | undefined {
    const failures = this.load<MeeRunFailureContext>(this.failuresFile());
    return failures.find((f) => f.runId === runId);
  }

  getByJob(jobId: string): MeeRunFailureContext | undefined {
    const failures = this.load<MeeRunFailureContext>(this.failuresFile());
    return failures.find((f) => f.jobId === jobId);
  }

  list(): MeeRunFailureContext[] {
    return this.load<MeeRunFailureContext>(this.failuresFile());
  }
}

export class FileMeeHealingPlanStore implements MeeHealingPlanStore {
  constructor(public readonly baseDir: string) {}

  public plansFile() {
    return path.join(this.baseDir, "mee-healing-plans.json");
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

  save(plan: MeeHealingPlan): void {
    const file = this.plansFile();
    const plans = this.load<MeeHealingPlan>(file);
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
    } else {
      plans.push(plan);
    }
    this.saveAll(file, plans);
  }

  get(id: string): MeeHealingPlan | undefined {
    const plans = this.load<MeeHealingPlan>(this.plansFile());
    return plans.find((p) => p.id === id);
  }

  getByParentJob(jobId: string): MeeHealingPlan | undefined {
    const plans = this.load<MeeHealingPlan>(this.plansFile());
    return plans.find((p) => p.parentJobId === jobId);
  }

  list(): MeeHealingPlan[] {
    return this.load<MeeHealingPlan>(this.plansFile());
  }
}
