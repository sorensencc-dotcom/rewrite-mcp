// File: projects/cic/evolution/src/amb/ambMasHealthGate.ts | Date: 2026-06-05 | v1.0.0

import { MAS_HEALTH_THRESHOLDS, MasHealthSnapshot } from "./ambMasHealthConfig.js";
import { AmbIntentArtifact } from "../types/ambIntent.js";

export class AmbMasHealthGate {
  constructor(private masSnapshot: MasHealthSnapshot) {}

  public isMasStableFor(intent: AmbIntentArtifact): boolean {
    const thresholds = MAS_HEALTH_THRESHOLDS;

    if (this.masSnapshot.globalErrorRate > thresholds.maxGlobalErrorRate) {
      return false;
    }
    if (this.masSnapshot.globalTimeoutRate > thresholds.maxTimeoutRate) {
      return false;
    }
    if (this.masSnapshot.queueBacklogDepth > thresholds.maxBacklogDepth) {
      return false;
    }
    if (this.masSnapshot.criticalAgentsHealth < thresholds.criticalAgentsMinHealth) {
      return false;
    }

    return true;
  }
}
