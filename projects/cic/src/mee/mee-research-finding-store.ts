// File: projects/cic/src/mee/mee-research-finding-store.ts | Date: 2026-06-04 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { ResearchFinding } from "./mee-schema.js";

interface MeeFindingsFile {
  findings: ResearchFinding[];
}

const DEFAULT_DATA: MeeFindingsFile = { findings: [] };

export class FileMeeResearchFindingStore {
  private filePath: string;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, "projects", "cic", "data", "mee", "findings.json");
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFile(): MeeFindingsFile {
    try {
      if (!fs.existsSync(this.filePath)) {
        return DEFAULT_DATA;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as MeeFindingsFile;
      if (!Array.isArray(parsed.findings)) return DEFAULT_DATA;
      return parsed;
    } catch {
      return DEFAULT_DATA;
    }
  }

  private saveFile(data: MeeFindingsFile): void {
    this.ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  loadAll(): ResearchFinding[] {
    return this.loadFile().findings;
  }

  get(id: string): ResearchFinding | null {
    return this.loadAll().find((f) => f.id === id) ?? null;
  }

  add(finding: ResearchFinding): void {
    const data = this.loadFile();
    data.findings = [...data.findings, finding];
    this.saveFile(data);
  }

  update(id: string, partial: Partial<ResearchFinding>): void {
    const data = this.loadFile();
    const idx = data.findings.findIndex((f) => f.id === id);
    if (idx === -1) return;
    data.findings[idx] = { ...data.findings[idx], ...partial };
    this.saveFile(data);
  }

  saveAll(findings: ResearchFinding[]): void {
    this.saveFile({ findings });
  }
}
