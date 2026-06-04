// File: projects/cic/src/mee/mee-memory-store.ts | Date: 2026-06-04 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { MeeMemoryItem } from "./mee-schema.js";

export interface MeeMemoryStore {
  add(item: MeeMemoryItem): void;
  get(id: string): MeeMemoryItem | undefined;
  queryByTags(tags: string[]): MeeMemoryItem[];
  queryByJob(jobId: string): MeeMemoryItem[];
}

export class InMemoryMeeMemoryStore implements MeeMemoryStore {
  private items = new Map<string, MeeMemoryItem>();

  add(item: MeeMemoryItem): void {
    this.items.set(item.id, item);
  }

  get(id: string): MeeMemoryItem | undefined {
    return this.items.get(id);
  }

  queryByTags(tags: string[]): MeeMemoryItem[] {
    const set = new Set(tags);
    return Array.from(this.items.values()).filter((i) =>
      i.tags.some((t) => set.has(t))
    );
  }

  queryByJob(jobId: string): MeeMemoryItem[] {
    return Array.from(this.items.values()).filter((i) => i.jobId === jobId);
  }
}

export class FileMeeMemoryStore implements MeeMemoryStore {
  constructor(public readonly baseDir: string) {}

  public memoryFile() {
    return path.join(this.baseDir, "mee-memory.json");
  }

  public load(): MeeMemoryItem[] {
    if (!fs.existsSync(this.memoryFile())) return [];
    try {
      const raw = fs.readFileSync(this.memoryFile(), "utf8");
      return JSON.parse(raw) as MeeMemoryItem[];
    } catch {
      return [];
    }
  }

  private saveAll(items: MeeMemoryItem[]) {
    fs.mkdirSync(path.dirname(this.memoryFile()), { recursive: true });
    fs.writeFileSync(this.memoryFile(), JSON.stringify(items, null, 2), "utf8");
  }

  add(item: MeeMemoryItem): void {
    const items = this.load();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    this.saveAll(items);
  }

  get(id: string): MeeMemoryItem | undefined {
    return this.load().find((i) => i.id === id);
  }

  queryByTags(tags: string[]): MeeMemoryItem[] {
    const set = new Set(tags);
    return this.load().filter((i) =>
      i.tags.some((t) => set.has(t))
    );
  }

  queryByJob(jobId: string): MeeMemoryItem[] {
    return this.load().filter((i) => i.jobId === jobId);
  }
}
