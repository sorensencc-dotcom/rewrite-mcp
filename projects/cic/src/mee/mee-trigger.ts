// File: projects/cic/src/mee/mee-trigger.ts | Date: 2026-06-03 | v1.1.0

import { MeeTriggerEvent } from "./mee-schema.js";
import { CkgStore } from "../ckg/ckg-store.js";
import crypto from "node:crypto";

export class MeeTriggerEngine {
  constructor(private ckg: CkgStore) {}

  detectTriggers(): MeeTriggerEvent[] {
    const events: MeeTriggerEvent[] = [];
    const graph = this.ckg.load();

    const orphans = graph.meta?.hotspots?.orphans || [];
    if (orphans.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: "capability_gap",
        payload: { orphans },
        timestamp: Date.now(),
      });
    }

    const stateDiscrepancies = graph.meta?.drift?.stateDiscrepancies || [];
    if (stateDiscrepancies.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: "drift",
        payload: { stateDiscrepancies },
        timestamp: Date.now(),
      });
    }

    const unmappedSkills = graph.meta?.drift?.unmappedSkills || [];
    if (unmappedSkills.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: "capability_gap",
        payload: { unmappedSkills },
        timestamp: Date.now(),
      });
    }

    return events;
  }

  serialize(event: MeeTriggerEvent): object {
    return { ...event };
  }

  deserialize(raw: any): MeeTriggerEvent {
    return {
      id: raw.id,
      type: raw.type,
      payload: raw.payload ?? {},
      timestamp: raw.timestamp ?? Date.now(),
    };
  }
}
