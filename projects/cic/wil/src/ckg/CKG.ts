// File: src/ckg/CKG.ts
import { APRPlan } from "../apr/APR";
import { CRORun } from "../cro/CRO";

export class CKG {
  ingestAPRPlan(plan: APRPlan) {
    // add plan entities/relations to knowledge graph
    console.log(`[CKG] Ingested APR plan: ${plan.planId}`);
  }

  ingestCRORun(run: CRORun) {
    // add execution episode to knowledge graph
    console.log(`[CKG] Ingested CRO run: ${run.runId}`);
  }
}
