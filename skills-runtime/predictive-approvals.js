#!/usr/bin/env node

/**
 * Predictive Approvals System
 *
 * Analyzes build plans and predicts required commands BEFORE execution.
 * Pre-approves and whitelists predicted commands to eliminate approval friction.
 *
 * Workflow:
 * 1. Parse roadmap/phase documentation
 * 2. Extract phase commands and patterns
 * 3. Predict commands needed for upcoming phases
 * 4. Pre-approve all predicted commands
 * 5. Whitelist them for immediate execution
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ApprovalHandler } from "./approval-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = path.join(__dirname, "../docs/cic/CIC_MASTER_ROADMAP.md");
const HANDOFF_PATH = path.join(__dirname, "../HANDOFF.md");

class PredictiveApprovals {
  constructor() {
    this.handler = new ApprovalHandler();
    this.predictedCommands = [];
    this.commandPatterns = this.initializeCommandPatterns();
    this.phaseCommands = new Map();
  }

  /**
   * Initialize command patterns by phase type
   */
  initializeCommandPatterns() {
    return {
      "test|verify|validate": [
        "npm test",
        "npm run test:rewrite-labs",
        "npx vitest run",
        "npm run cic-ui:validate",
        "npm run cic-ui:smoke",
      ],
      "build|compile|generate": [
        "npm run build-docs",
        "npm run doc:drift",
        "npm run policy:check",
        "npm run gh-actions:check",
      ],
      "deploy|release|publish": [
        "npm run release:full",
        "npm run release:notes",
        "npm run release:tag",
        "npm run sync-docs",
      ],
      "analysis|audit|scan": [
        "npm run policy:report",
        "npm run policy:audit",
        "npm run cic-ui:sentinel",
      ],
      "integration|orchestration": [
        "npm start",
        "npm run cic:evolution-loop",
        "npm run cic:amb-run",
      ],
      "benchmark|performance": [
        "npm run bench:capture",
        "npm run bench:metadata",
        "npm run bench:opus-sonnet",
      ],
    };
  }

  /**
   * Parse roadmap file for phase information
   */
  parseRoadmap() {
    try {
      if (!fs.existsSync(ROADMAP_PATH)) {
        return [];
      }

      const content = fs.readFileSync(ROADMAP_PATH, "utf-8");
      const phases = [];

      // Extract phase sections
      const phaseRegex = /## \*\*PHASE (\d+[.\d]*)\s*—\s*([^*]+)\*\*/g;
      let match;

      while ((match = phaseRegex.exec(content)) !== null) {
        phases.push({
          number: match[1],
          title: match[2].trim(),
          section: content.substring(match.index, match.index + 500),
        });
      }

      return phases;
    } catch (e) {
      console.warn(`Could not parse roadmap: ${e.message}`);
      return [];
    }
  }

  /**
   * Parse HANDOFF for historical command patterns
   */
  parseHandoff() {
    try {
      if (!fs.existsSync(HANDOFF_PATH)) {
        return {};
      }

      const content = fs.readFileSync(HANDOFF_PATH, "utf-8");
      const patterns = {};

      // Extract command references (npm run, npx, etc.)
      const cmdRegex = /(?:npm|npx|node|git|bash)\s+(?:run\s+)?([a-zA-Z0-9:\-_]+)/g;
      const matches = content.matchAll(cmdRegex);

      for (const match of matches) {
        const cmd = match[0];
        patterns[cmd] = (patterns[cmd] || 0) + 1;
      }

      return patterns;
    } catch (e) {
      console.warn(`Could not parse HANDOFF: ${e.message}`);
      return {};
    }
  }

  /**
   * Predict commands for a given phase
   */
  predictCommandsForPhase(phaseTitle, phaseSection) {
    const predicted = [];
    const keywords = phaseTitle.toLowerCase();

    // Match keywords to command patterns
    for (const [pattern, commands] of Object.entries(this.commandPatterns)) {
      const patternRegex = new RegExp(pattern, "i");
      if (patternRegex.test(keywords) || patternRegex.test(phaseSection)) {
        predicted.push(...commands);
      }
    }

    // Remove duplicates
    return [...new Set(predicted)];
  }

  /**
   * Generate predictions for upcoming phases
   */
  generatePredictions(upcomingPhases = 2) {
    const phases = this.parseRoadmap();
    const handoffPatterns = this.parseHandoff();
    const predictions = [];

    // Get most recent phases
    const recentPhases = phases.slice(-upcomingPhases);

    for (const phase of recentPhases) {
      const predictedCommands = this.predictCommandsForPhase(
        phase.title,
        phase.section
      );

      // Add historical frequency score
      const commandsWithScores = predictedCommands.map((cmd) => ({
        command: cmd,
        confidence: handoffPatterns[cmd] ? 0.9 : 0.7,
        frequency: handoffPatterns[cmd] || 0,
      }));

      predictions.push({
        phase: phase.number,
        title: phase.title,
        commands: commandsWithScores,
      });
    }

    this.predictedCommands = predictions;
    return predictions;
  }

  /**
   * Pre-approve predicted commands
   */
  preApproveCommands() {
    const approvals = [];

    for (const prediction of this.predictedCommands) {
      for (const cmd of prediction.commands) {
        // Only approve if confidence is high
        if (cmd.confidence >= 0.8 || cmd.frequency > 0) {
          const reason = `Pre-approved for Phase ${prediction.phase}: ${prediction.title}`;

          const result = this.handler.approveCommand(
            cmd.command,
            reason,
            null
          );

          approvals.push({
            command: cmd.command,
            phase: prediction.phase,
            reason,
            confidence: cmd.confidence,
            result,
          });
        }
      }
    }

    return approvals;
  }

  /**
   * Generate pre-approval report
   */
  generatePreApprovalReport() {
    const predictions = this.predictedCommands;
    const approvals = this.preApproveCommands();

    const report = {
      timestamp: new Date().toISOString(),
      type: "predictive-approvals",
      phaseAnalysis: predictions,
      preApprovals: approvals,
      summary: {
        phasesAnalyzed: predictions.length,
        commandsIdentified: predictions.reduce(
          (sum, p) => sum + p.commands.length,
          0
        ),
        commandsApproved: approvals.length,
        highConfidence: approvals.filter((a) => a.confidence >= 0.9).length,
        mediumConfidence: approvals.filter(
          (a) => a.confidence < 0.9 && a.confidence >= 0.7
        ).length,
      },
    };

    return report;
  }

  /**
   * Save pre-approval report
   */
  saveReport(report) {
    const filename = `predictive-approvals-${new Date().toISOString().split("T")[0]}.json`;
    const filepath = path.join(__dirname, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2), "utf-8");
      return filepath;
    } catch (e) {
      console.error(`Error saving report: ${e.message}`);
      return null;
    }
  }
}

// Export for module use
export { PredictiveApprovals };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("\n🔮 PREDICTIVE APPROVALS SYSTEM\n");
  console.log("=" + "=".repeat(70));

  const predictor = new PredictiveApprovals();

  console.log("\n1. Analyzing build plan...");
  const predictions = predictor.generatePredictions(3);

  if (predictions.length === 0) {
    console.log("   (No phases found - ensure CIC_MASTER_ROADMAP.md exists)");
  } else {
    console.log(`   ✓ Found ${predictions.length} phases\n`);

    console.log("2. Predicting required commands:\n");
    for (const pred of predictions) {
      console.log(
        `   Phase ${pred.phase}: ${pred.title}`
      );
      console.log(
        `   Predicted commands: ${pred.commands.length}`
      );
      pred.commands.slice(0, 3).forEach((cmd) => {
        console.log(
          `     • ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(0)}%)`
        );
      });
      if (pred.commands.length > 3) {
        console.log(
          `     + ${pred.commands.length - 3} more commands...`
        );
      }
      console.log();
    }

    console.log("3. Pre-approving predicted commands...");
    const approvals = predictor.preApproveCommands();
    console.log(`   ✓ Pre-approved ${approvals.length} commands\n`);

    console.log("4. Generating report...");
    const report = predictor.generatePreApprovalReport();
    const reportPath = predictor.saveReport(report);

    console.log("\nPRE-APPROVAL SUMMARY:");
    console.log(`  Phases analyzed: ${report.summary.phasesAnalyzed}`);
    console.log(
      `  Commands identified: ${report.summary.commandsIdentified}`
    );
    console.log(
      `  Commands pre-approved: ${report.summary.commandsApproved}`
    );
    console.log(
      `  High confidence (90%+): ${report.summary.highConfidence}`
    );
    console.log(
      `  Medium confidence (70%+): ${report.summary.mediumConfidence}`
    );

    if (reportPath) {
      console.log(`\n✅ Report saved to: ${reportPath}`);
    }
  }

  console.log("\n" + "=".repeat(70) + "\n");
}
