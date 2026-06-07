// File: projects/cic/src/mee/mee-proposal-store.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { PhaseProposal } from "./mee-schema.js";

interface MeeProposalFile {
  proposals: PhaseProposal[];
}

const DEFAULT_DATA: MeeProposalFile = { proposals: [] };

export class MeeProposalStore {
  private filePath: string;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, "projects", "cic", "data", "mee", "proposals.json");
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFile(): MeeProposalFile {
    try {
      if (!fs.existsSync(this.filePath)) {
        return DEFAULT_DATA;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as MeeProposalFile;
      if (!Array.isArray(parsed.proposals)) return DEFAULT_DATA;
      return parsed;
    } catch {
      return DEFAULT_DATA;
    }
  }

  private saveFile(data: MeeProposalFile): void {
    this.ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  loadAll(): PhaseProposal[] {
    return this.loadFile().proposals;
  }

  get(id: string): PhaseProposal | null {
    return this.loadAll().find((p) => p.id === id) ?? null;
  }

  add(proposal: PhaseProposal): void {
    const data = this.loadFile();
    data.proposals = [...data.proposals, proposal];
    this.saveFile(data);
  }

  update(id: string, partial: Partial<PhaseProposal>): void {
    const data = this.loadFile();
    const idx = data.proposals.findIndex((p) => p.id === id);
    if (idx === -1) return;
    data.proposals[idx] = { ...data.proposals[idx], ...partial };
    this.saveFile(data);
  }

  saveAll(proposals: PhaseProposal[]): void {
    this.saveFile({ proposals });
  }
}
