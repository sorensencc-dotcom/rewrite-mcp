// File: projects/cic/src/mee/mee-phase-spec-store.ts | Date: 2026-06-04 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { MeePhaseSpec } from "./mee-schema.js";

interface MeePhaseSpecFile {
  phases: MeePhaseSpec[];
}

const DEFAULT_DATA: MeePhaseSpecFile = { phases: [] };

export class FileMeePhaseSpecStore {
  private filePath: string;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, "projects", "cic", "data", "mee", "phases.json");
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFile(): MeePhaseSpecFile {
    try {
      if (!fs.existsSync(this.filePath)) {
        return DEFAULT_DATA;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as MeePhaseSpecFile;
      if (!Array.isArray(parsed.phases)) return DEFAULT_DATA;
      return parsed;
    } catch {
      return DEFAULT_DATA;
    }
  }

  private saveFile(data: MeePhaseSpecFile): void {
    this.ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  loadAll(): MeePhaseSpec[] {
    return this.loadFile().phases;
  }

  get(id: string): MeePhaseSpec | null {
    return this.loadAll().find((p) => p.id === id) ?? null;
  }

  add(phase: MeePhaseSpec): void {
    const data = this.loadFile();
    data.phases = [...data.phases, phase];
    this.saveFile(data);
  }

  update(id: string, partial: Partial<MeePhaseSpec>): void {
    const data = this.loadFile();
    const idx = data.phases.findIndex((p) => p.id === id);
    if (idx === -1) return;
    data.phases[idx] = { ...data.phases[idx], ...partial };
    this.saveFile(data);
  }

  saveAll(phases: MeePhaseSpec[]): void {
    this.saveFile({ phases });
  }
}
