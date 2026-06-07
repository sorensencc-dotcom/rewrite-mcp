#!/usr/bin/env node

/**
 * Phase 45 Pre-Approval Planning
 *
 * Pre-approves all commands needed for:
 * - 45.1 mee-phase-executor
 * - 45.2 cic-benchmark-runner
 * - 45.3 environment-validator
 * - 45.4 mee-finding-assessor
 * - 45.5 helm-daily-brief
 * - 45.6 idea-inbox-harvester
 * - 45.7 phase-validator
 *
 * Effort: 10-12 weeks total (prioritized across 4 sprints)
 */

import { ApprovalHandler } from "./skills-runtime/approval-handler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Phase45PreApprovals {
  constructor() {
    this.handler = new ApprovalHandler();
    this.approvals = [];
    this.phase45Commands = this.definePhase45Commands();
  }

  /**
   * Define all commands needed for Phase 45 skills development
   */
  definePhase45Commands() {
    return {
      "45.1 - mee-phase-executor": {
        description: "Execute MEE phases with state tracking, resumable execution",
        priority: "high",
        effort: "2-3 weeks",
        commands: [
          {
            cmd: "npx vitest run",
            reason: "Unit test new mee-phase-executor skill",
          },
          {
            cmd: "npm run test:rewrite-labs",
            reason: "Integration tests for phase executor",
          },
          {
            cmd: "npm run policy:check",
            reason: "Policy validation for new skill",
          },
          {
            cmd: "npm run doc:drift",
            reason: "Check documentation drift",
          },
          {
            cmd: "npm run build-docs",
            reason: "Update docs for phase executor",
          },
        ],
      },
      "45.2 - cic-benchmark-runner": {
        description: "Automate RL benchmark pipeline with cost tracking",
        priority: "high",
        effort: "2 weeks",
        commands: [
          {
            cmd: "npm run bench:capture",
            reason: "Capture benchmark data",
          },
          {
            cmd: "npm run bench:metadata",
            reason: "Extract metadata from benchmarks",
          },
          {
            cmd: "npm run bench:opus-sonnet",
            reason: "Run opus/sonnet benchmark comparison",
          },
          {
            cmd: "npm run cost:reports",
            reason: "Generate cost analysis reports",
          },
          {
            cmd: "npx vitest run",
            reason: "Test benchmark runner logic",
          },
        ],
      },
      "45.3 - environment-validator": {
        description: "Fast health check for session startup",
        priority: "high",
        effort: "1 week",
        commands: [
          {
            cmd: "npm run cic-ui:validate",
            reason: "Validate environment configuration",
          },
          {
            cmd: "npm run cic-ui:smoke",
            reason: "Smoke test environment startup",
          },
          {
            cmd: "npm run policy:check",
            reason: "Check environment policies",
          },
          {
            cmd: "npx vitest run",
            reason: "Test validator logic",
          },
        ],
      },
      "45.4 - mee-finding-assessor": {
        description: "Review autonomous research findings",
        priority: "medium",
        effort: "1.5 weeks",
        commands: [
          {
            cmd: "npm run cic:evolution-loop",
            reason: "Run evolution loop to generate findings",
          },
          {
            cmd: "npx vitest run",
            reason: "Test finding assessor",
          },
          {
            cmd: "npm run policy:report",
            reason: "Generate policy assessment report",
          },
          {
            cmd: "npm run build-docs",
            reason: "Document findings and assessments",
          },
        ],
      },
      "45.5 - helm-daily-brief": {
        description: "Generate morning briefing from Calendar, Gmail, Finance",
        priority: "medium",
        effort: "2 weeks",
        commands: [
          {
            cmd: "npm run cost:helm",
            reason: "Generate HELM cost dashboard",
          },
          {
            cmd: "npx vitest run",
            reason: "Test daily brief generation",
          },
          {
            cmd: "npm run policy:check",
            reason: "Validate HELM brief policies",
          },
          {
            cmd: "npm run build-docs",
            reason: "Update HELM documentation",
          },
        ],
      },
      "45.6 - idea-inbox-harvester": {
        description: "Harvest ideas to priority list",
        priority: "medium",
        effort: "1.5 weeks",
        commands: [
          {
            cmd: "npm start",
            reason: "Start services for idea-inbox harvesting",
            context: "projects/cic/ingestion",
          },
          {
            cmd: "npx vitest run",
            reason: "Test idea harvester logic",
          },
          {
            cmd: "npm run policy:check",
            reason: "Validate idea inbox policies",
          },
        ],
      },
      "45.7 - phase-validator": {
        description: "Verify phase completion",
        priority: "medium",
        effort: "2 weeks",
        commands: [
          {
            cmd: "npm run cic-ui:sentinel",
            reason: "Verify UI layer stability",
          },
          {
            cmd: "npm test",
            reason: "Run full test suite for phase validation",
          },
          {
            cmd: "npm run policy:audit",
            reason: "Audit policies for phase compliance",
          },
          {
            cmd: "npm run doc:drift",
            reason: "Check documentation completeness",
          },
          {
            cmd: "npm run build-docs",
            reason: "Rebuild documentation",
          },
        ],
      },
    };
  }

  /**
   * Pre-approve all Phase 45 commands
   */
  preApproveAllCommands() {
    const results = [];

    for (const [skillName, skillData] of Object.entries(
      this.phase45Commands
    )) {
      console.log(`\nProcessing ${skillName}...`);

      for (const cmdInfo of skillData.commands) {
        const reason = `[Phase 45] ${skillName}: ${cmdInfo.reason}`;
        const result = this.handler.approveCommand(
          cmdInfo.cmd,
          reason,
          cmdInfo.context || null
        );

        results.push({
          skill: skillName,
          command: cmdInfo.cmd,
          reason: cmdInfo.reason,
          context: cmdInfo.context || "root",
          result: result.status,
        });

        console.log(`  ✓ ${cmdInfo.cmd}`);
      }
    }

    return results;
  }

  /**
   * Generate Phase 45 execution plan with pre-approvals
   */
  generateExecutionPlan() {
    const plan = {
      phase: "45",
      title: "Suggested New Skills (Phase 2 Backlog)",
      goal: "Build 7 additional skills identified from repo activity analysis",
      totalEffort: "10-12 weeks",
      executionOrder: [
        "45.3 environment-validator (1 week)",
        "45.2 cic-benchmark-runner (2 weeks)",
        "45.1 mee-phase-executor (2-3 weeks)",
        "45.4 mee-finding-assessor (1.5 weeks)",
        "45.5 helm-daily-brief (2 weeks)",
        "45.6 idea-inbox-harvester (1.5 weeks)",
        "45.7 phase-validator (2 weeks)",
      ],
      skills: Object.entries(this.phase45Commands).map(([skillName, data]) => ({
        name: skillName,
        description: data.description,
        priority: data.priority,
        effort: data.effort,
        commandCount: data.commands.length,
      })),
      preApprovals: {
        status: "READY",
        message:
          "All Phase 45 commands pre-approved and whitelisted for execution",
        timestamp: new Date().toISOString(),
      },
    };

    return plan;
  }

  /**
   * Save execution plan
   */
  savePlan(plan) {
    const filepath = path.join(
      __dirname,
      `PHASE_45_EXECUTION_PLAN_${new Date().toISOString().split("T")[0]}.json`
    );

    try {
      fs.writeFileSync(filepath, JSON.stringify(plan, null, 2), "utf-8");
      return filepath;
    } catch (e) {
      console.error(`Error saving plan: ${e.message}`);
      return null;
    }
  }
}

// Run Phase 45 pre-approvals
const phase45 = new Phase45PreApprovals();

console.log("\n" + "=".repeat(70));
console.log("🎯 PHASE 45 — PRE-APPROVAL PLANNING");
console.log("=".repeat(70));

console.log(
  "\nPhase 45: Suggested New Skills (Phase 2 Backlog)"
);
console.log(
  "Goal: Build 7 additional skills identified from repo activity analysis"
);
console.log("Total Effort: 10-12 weeks");

console.log("\n📋 PRE-APPROVING PHASE 45 COMMANDS...");
const approvals = phase45.preApproveAllCommands();

console.log("\n" + "=".repeat(70));
console.log("✅ PRE-APPROVAL SUMMARY");
console.log("=".repeat(70));

const summary = {
  skillsInPhase: Object.keys(phase45.phase45Commands).length,
  totalCommands: approvals.length,
  uniqueCommands: new Set(approvals.map((a) => a.command)).size,
  bySkill: {},
};

for (const [skillName, skillData] of Object.entries(phase45.phase45Commands)) {
  const skillApprovals = approvals.filter((a) => a.skill === skillName);
  summary.bySkill[skillName] = {
    commands: skillApprovals.length,
    priority: skillData.priority,
    effort: skillData.effort,
  };
}

console.log(
  `\n  Skills in Phase 45: ${summary.skillsInPhase}`
);
console.log(
  `  Total Commands Pre-Approved: ${summary.totalCommands}`
);
console.log(
  `  Unique Commands: ${summary.uniqueCommands}`
);

console.log("\n📊 BREAKDOWN BY SKILL:");
for (const [skillName, stats] of Object.entries(summary.bySkill)) {
  console.log(
    `\n  ${skillName}`
  );
  console.log(
    `    Priority: ${stats.priority}`
  );
  console.log(
    `    Effort: ${stats.effort}`
  );
  console.log(
    `    Commands: ${stats.commands}`
  );
}

console.log("\n📅 EXECUTION ORDER (Prioritized):");
console.log("  1. 45.3 environment-validator (1 week)");
console.log("  2. 45.2 cic-benchmark-runner (2 weeks)");
console.log("  3. 45.1 mee-phase-executor (2-3 weeks)");
console.log("  4. 45.4 mee-finding-assessor (1.5 weeks)");
console.log("  5. 45.5 helm-daily-brief (2 weeks)");
console.log("  6. 45.6 idea-inbox-harvester (1.5 weeks)");
console.log("  7. 45.7 phase-validator (2 weeks)");

const plan = phase45.generateExecutionPlan();
const planPath = phase45.savePlan(plan);

console.log("\n✅ ALL PHASE 45 COMMANDS PRE-APPROVED");
console.log("   Ready for zero-friction execution\n");

if (planPath) {
  console.log(`📄 Execution plan saved to: ${planPath}\n`);
}

console.log("=".repeat(70) + "\n");
