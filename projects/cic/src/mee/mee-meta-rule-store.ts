// File: projects/cic/src/mee/mee-meta-rule-store.ts | Date: 2026-06-04 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { MeeMetaRule, isMeeMetaRule } from "./mee-schema.js";

interface MeeMetaRulesFile {
  rules: MeeMetaRule[];
}

const DEFAULT_DATA: MeeMetaRulesFile = { rules: [] };

export class FileMeeMetaRuleStore {
  private filePath: string;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, "projects", "cic", "data", "mee", "meta-rules.json");
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFile(): MeeMetaRulesFile {
    try {
      if (!fs.existsSync(this.filePath)) {
        return DEFAULT_DATA;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as MeeMetaRulesFile;
      if (!Array.isArray(parsed.rules)) return DEFAULT_DATA;
      return parsed;
    } catch {
      return DEFAULT_DATA;
    }
  }

  private saveFile(data: MeeMetaRulesFile): void {
    this.ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  loadAll(): MeeMetaRule[] {
    return this.loadFile().rules;
  }

  get(id: string): MeeMetaRule | null {
    return this.loadAll().find((r) => r.id === id) ?? null;
  }

  add(rule: MeeMetaRule): void {
    if (!isMeeMetaRule(rule)) {
      throw new Error(`Invalid MeeMetaRule schema: ${JSON.stringify(rule)}`);
    }
    const data = this.loadFile();
    data.rules = [...data.rules, rule];
    this.saveFile(data);
  }

  update(id: string, partial: Partial<MeeMetaRule>): void {
    const data = this.loadFile();
    const idx = data.rules.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const updated = { ...data.rules[idx], ...partial };
    if (!isMeeMetaRule(updated)) {
      throw new Error(`Invalid MeeMetaRule schema after update: ${JSON.stringify(updated)}`);
    }
    data.rules[idx] = updated;
    this.saveFile(data);
  }

  saveAll(rules: MeeMetaRule[]): void {
    if (!rules.every(isMeeMetaRule)) {
      throw new Error("One or more rules do not match MeeMetaRule schema.");
    }
    this.saveFile({ rules });
  }
}
