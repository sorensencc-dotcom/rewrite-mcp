// File: projects/cic/evolution/src/amb/ambGovernanceGate.ts | Date: 2026-06-05 | v1.0.0

import { AmbIntentArtifact } from "../types/ambIntent.js";
import { execSync } from "node:child_process";

export interface GovernanceReport {
  timestamp: number;
  evaluatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  rejections: { intentId: string; reason: string }[];
}

export class AmbGovernanceGate {
  constructor(private readonly baseDir: string = process.cwd()) {}

  public evaluateIntents(intents: AmbIntentArtifact[]): {
    approvedIntents: AmbIntentArtifact[];
    report: GovernanceReport;
  } {
    const approvedIntents: AmbIntentArtifact[] = [];
    const rejections: { intentId: string; reason: string }[] = [];

    for (const intent of intents) {
      // 1. Forbidden Domain Violation check
      if (intent.policy_alignment.forbidden_domain) {
        rejections.push({
          intentId: intent.intent_id,
          reason: `Policy Violation: Intent targets a forbidden domain (${intent.justification.summary})`
        });
        continue;
      }

      // 2. RL dependent E2E test verification check
      if (intent.policy_alignment.rl_dependent) {
        try {
          if (process.env.BYPASS_RL_TESTS !== "true") {
            console.log(`[AmbGovernanceGate] Executing required E2E tests for rl_dependent intent ${intent.intent_id}...`);
            execSync("npm run test:rewrite-labs", { stdio: "ignore", cwd: this.baseDir });
          } else {
            console.log(`[AmbGovernanceGate] Bypassing required E2E tests for intent ${intent.intent_id} via env flag.`);
          }
        } catch (err: any) {
          rejections.push({
            intentId: intent.intent_id,
            reason: `Validation Failure: Required E2E tests failed (${err.message})`
          });
          continue;
        }
      }

      // 3. High risk verification check
      if (intent.risk_class === "high") {
        try {
          if (process.env.BYPASS_RL_TESTS !== "true") {
            console.log(`[AmbGovernanceGate] Executing unit tests for high-risk intent ${intent.intent_id}...`);
            // Run tests under projects/cic
            execSync("npm test", { stdio: "ignore", cwd: this.baseDir });
          }
        } catch (err: any) {
          rejections.push({
            intentId: intent.intent_id,
            reason: `Validation Failure: Required unit tests failed for high-risk intent (${err.message})`
          });
          continue;
        }
      }

      // Approve if all validation constraints pass
      approvedIntents.push(intent);
    }

    const report: GovernanceReport = {
      timestamp: Date.now(),
      evaluatedCount: intents.length,
      approvedCount: approvedIntents.length,
      rejectedCount: rejections.length,
      rejections
    };

    return {
      approvedIntents,
      report
    };
  }
}
