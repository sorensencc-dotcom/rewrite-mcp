// File: projects/cic/src/cic/control-plane/telemetry-sink.ts | Date: 2026-06-01 | v1.5.0
import { SkillTelemetry, InstinctTelemetry } from "./telemetry-types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TelemetrySink {
  recordSkill(event: SkillTelemetry): Promise<void>;
  recordInstinct(event: InstinctTelemetry): Promise<void>;
  enrichInstinct(runId: string, enrichment: Partial<InstinctTelemetry>): Promise<void>;
  querySkills(filter?: Record<string, any>): Promise<SkillTelemetry[]>;
  queryInstincts(filter?: Record<string, any>): Promise<InstinctTelemetry[]>;
  clear(): Promise<void>;
}

export class NoopTelemetrySink implements TelemetrySink {
  async recordSkill() {}
  async recordInstinct() {}
  async enrichInstinct() {}
  async querySkills() { return []; }
  async queryInstincts() { return []; }
  async clear() {}
}

export class DefaultTelemetrySink implements TelemetrySink {
  private skillsStore: SkillTelemetry[] = [];
  private instinctsStore: InstinctTelemetry[] = [];
  private logDir: string;

  constructor(logDir?: string) {
    this.logDir = logDir || path.resolve(__dirname, "../../../data/telemetry");
  }

  private ensureDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async recordSkill(event: SkillTelemetry): Promise<void> {
    this.skillsStore.push(event);
    try {
      this.ensureDir();
      const filePath = path.join(this.logDir, "skills.jsonl");
      fs.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
    } catch (err: any) {
      console.error(`[TelemetrySink] Failed to write skill log:`, err.message);
    }
  }

  async recordInstinct(event: InstinctTelemetry): Promise<void> {
    this.instinctsStore.push(event);
    try {
      this.ensureDir();
      const filePath = path.join(this.logDir, "instincts.jsonl");
      fs.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
    } catch (err: any) {
      console.error(`[TelemetrySink] Failed to write instinct log:`, err.message);
    }
  }

  async enrichInstinct(runId: string, enrichment: Partial<InstinctTelemetry>): Promise<void> {
    this.instinctsStore = this.instinctsStore.map(e => {
      if (e.runId === runId) {
        return { ...e, ...enrichment };
      }
      return e;
    });

    try {
      this.ensureDir();
      const filePath = path.join(this.logDir, "instincts.jsonl");
      const content = this.instinctsStore.map(e => JSON.stringify(e)).join("\n") + "\n";
      fs.writeFileSync(filePath, content, "utf-8");
    } catch (err: any) {
      console.error(`[TelemetrySink] Failed to write enriched instinct log:`, err.message);
    }
  }

  async querySkills(filter: Record<string, any> = {}): Promise<SkillTelemetry[]> {
    let result = [...this.skillsStore];

    if (filter.pipeline) result = result.filter(e => e.pipeline === filter.pipeline);
    if (filter.skillName) result = result.filter(e => e.skillName === filter.skillName);
    if (filter.tenantId) result = result.filter(e => e.tenantId === filter.tenantId);
    if (filter.region) result = result.filter(e => e.region === filter.region);

    const limit = filter.limit ? Number(filter.limit) : 100;
    return result.slice(0, limit);
  }

  async queryInstincts(filter: Record<string, any> = {}): Promise<InstinctTelemetry[]> {
    let result = [...this.instinctsStore];

    if (filter.pipeline) result = result.filter(e => e.pipeline === filter.pipeline);
    if (filter.instinctName) result = result.filter(e => e.instinctName === filter.instinctName);
    if (filter.tenantId) result = result.filter(e => e.tenantId === filter.tenantId);
    if (filter.region) result = result.filter(e => e.region === filter.region);

    const limit = filter.limit ? Number(filter.limit) : 100;
    return result.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.skillsStore = [];
    this.instinctsStore = [];
    try {
      const skillsPath = path.join(this.logDir, "skills.jsonl");
      const instinctsPath = path.join(this.logDir, "instincts.jsonl");
      if (fs.existsSync(skillsPath)) fs.unlinkSync(skillsPath);
      if (fs.existsSync(instinctsPath)) fs.unlinkSync(instinctsPath);
    } catch (err: any) {
      console.warn(`[TelemetrySink] Failed to delete logs during clear:`, err.message);
    }
  }
}

let activeSink: TelemetrySink = new DefaultTelemetrySink();

export function setTelemetrySink(sink: TelemetrySink): void {
  activeSink = sink;
}

export function getTelemetrySink(): TelemetrySink {
  return activeSink;
}
