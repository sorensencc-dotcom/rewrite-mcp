// File: projects/cic/evolution/src/amb/ambMasHealthGate.ts | Date: 2026-06-05 | v1.0.0

import { MAS_HEALTH_THRESHOLDS, MasHealthSnapshot } from "./ambMasHealthConfig.js";
import { AmbIntentArtifact } from "../types/ambIntent.js";

export class AmbMasHealthGate {
  constructor(private masSnapshot: MasHealthSnapshot) {}

  isMasStableFor(_intent: AmbIntentArtifact): boolean {
    const t = MAS_HEALTH_THRESHOLDS;

    if (this.masSnapshot.globalErrorRate > t.maxGlobalErrorRate) return false;
    if (this.masSnapshot.globalTimeoutRate > t.maxTimeoutRate) return false;
    if (this.masSnapshot.queueBacklogDepth > t.maxBacklogDepth) return false;
    if (this.masSnapshot.criticalAgentsHealth < t.criticalAgentsMinHealth) return false;

    return true;
  }
}
