#!/usr/bin/env node
/**
 * Real-Time Policy Validator CLI
 *
 * Called by pre-commit hook to validate staged changes.
 * Blocks commits that violate zone ownership, bundling, or tool rules.
 *
 * Usage: node validate-commit.js <commit-message-file> <repo-root>
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PolicyValidator } from "./PolicyValidator.js"; // now importing the JS version

async function main() {
  const commitMsgFile = process.argv[2];
  const repoRoot = process.argv[3] || process.cwd();

  if (!commitMsgFile) {
    console.error("Usage: validate-commit.js <commit-message-file> [repo-root]");
    process.exit(1);
  }

  // Read commit message
  let commitMsg = "";
  try {
    commitMsg = readFileSync(commitMsgFile, "utf-8").trim();
  } catch (err) {
    console.error(`Failed to read commit message: ${err}`);
    process.exit(1);
  }

  // Validate
  const validator = new PolicyValidator(repoRoot);
  const isValid = validator.validate(commitMsg);

  // Print report
  const report = validator.report();
  console.log(report);

  // Exit with appropriate code
  if (!isValid) {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ POLICY VIOLATIONS DETECTED — Commit blocked.");
    console.log("");
    console.log("To fix:");
    console.log("  1. Review the violations above");
    console.log("  2. Unstage violating files: git reset HEAD <file>");
    console.log("  3. Ensure commit message starts with [claude/copilot/gemini/human]");
    console.log("  4. Verify no files from different zones are being committed together");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`Validator error: ${err}`);
  process.exit(1);
});
