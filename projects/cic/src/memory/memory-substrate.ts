// File: projects/cic/src/memory/memory-substrate.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";

export interface MemoryEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export class MemorySubstrate {
  constructor(private ledgerPath: string) {}

  append(event: MemoryEvent): void {
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(this.ledgerPath, JSON.stringify(event) + "\n", "utf8");
  }

  query(filter: { type?: string }): MemoryEvent[] {
    if (!fs.existsSync(this.ledgerPath)) {
      return [];
    }
    const content = fs.readFileSync(this.ledgerPath, "utf8");
    const lines = content.split("\n").filter(line => line.trim() !== "");
    const events: MemoryEvent[] = lines.map(line => JSON.parse(line));
    if (filter.type) {
      return events.filter(e => e.type === filter.type);
    }
    return events;
  }

  snapshot(): any {
    const events = this.query({});
    const summary: Record<string, number> = {};
    for (const e of events) {
      summary[e.type] = (summary[e.type] || 0) + 1;
    }
    return {
      totalEvents: events.length,
      types: summary,
      lastEvent: events.length > 0 ? events[events.length - 1] : null
    };
  }
}
