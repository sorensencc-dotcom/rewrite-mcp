// File: projects/cic/src/mee/mee-trigger.ts | Date: 2026-06-03 | v1.0.0

import { PhaseTriggerEvent } from "./mee-schema.js";
import { CkgStore } from "../ckg/ckg-store.js";
import crypto from "node:crypto";

export class MeeTriggerEngine {
  constructor(private ckg: CkgStore) {}

  detectTriggers(): PhaseTriggerEvent[] {
    const events: PhaseTriggerEvent[] = [];
    const graph = this.ckg.load();

    // Check for orphans in CKG meta
    const orphans = graph.meta?.hotspots?.orphans || [];
    if (orphans.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: "capability_gap",
        source: "CKG",
        details: { orphans },
        timestamp: Date.now(),
      });
    }

    // Check for state discrepancies in CKG drift
    const stateDiscrepancies = graph.meta?.drift?.stateDiscrepancies || [];
    if (stateDiscrepancies.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: "drift",
        source: "CKG",
        details: { stateDiscrepancies },
        timestamp: Date.now(),
      });
    }

    return events;
  }
}
