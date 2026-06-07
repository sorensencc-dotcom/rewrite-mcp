// File: projects/cic/src/memory/memory-api.ts | Date: 2026-06-03 | v1.0.0

import { MemorySubstrate } from "./memory-substrate.js";

export class MemoryAPI {
  constructor(private substrate: MemorySubstrate) {}

  getEvents(type?: string) {
    return this.substrate.query({ type });
  }

  getTrends() {
    return this.substrate.snapshot();
  }
}
