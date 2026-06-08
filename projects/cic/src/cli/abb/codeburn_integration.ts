#!/usr/bin/env node
/**
 * ABB Handler: CodeBurn ↔ TokenEconomyAgent Integration
 *
 * Executes the full CodeBurn integration batch block.
 * Usage:
 *   cic-cli run-abb plan --id ABB-CODEBURN-INTEGRATION
 *   cic-cli run-abb execute --id ABB-CODEBURN-INTEGRATION
 */

import fs from "node:fs";
import path from "node:path";

const ABB_ID = "ABB-CODEBURN-INTEGRATION";

interface AbbStep {
  id: string;
  description: string;
  artifacts?: string[];
}

interface AbbSpec {
  abb_id: string;
  title: string;
  version: string;
  roadmap_spec: Record<string, unknown>;
  roadmap_tracking_insert: Record<string, unknown>;
  implementation_block: {
    steps: AbbStep[];
    [key: string]: unknown;
  };
}

function loadAbb(): AbbSpec {
  const file = path.join(__dirname, "../../..", "abb/definitions/ABB-CODEBURN-INTEGRATION.json");
  const content = fs.readFileSync(file, "utf8");
  return JSON.parse(content);
}

function cmdPlan(): void {
  const abb = loadAbb();
  const output = {
    abb_id: ABB_ID,
    roadmap_spec: abb.roadmap_spec,
    roadmap_tracking_insert: abb.roadmap_tracking_insert
  };
  console.log(JSON.stringify(output, null, 2));
}

function cmdExecute(): void {
  const abb = loadAbb();
  console.log(`[ABB] Executing ${ABB_ID}...`);
  console.log(`[ABB] Title: ${abb.title}`);
  console.log(`[ABB] Version: ${abb.version}`);

  // Step 1: Ensure all artifact directories exist
  const dirs = abb.implementation_block.steps
    .flatMap((step: { artifacts?: string[] }) => step.artifacts || [])
    .map((artifact: string) => path.dirname(artifact));

  const uniqueDirs = [...new Set(dirs)];
  uniqueDirs.forEach((dir) => {
    const fullPath = path.join(__dirname, "../../..", dir);
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`[ABB] Created directory: ${dir}`);
  });

  // Step 2: Log execution plan
  console.log(`\n[ABB] Implementation steps:`);
  abb.implementation_block.steps.forEach((step: { id: string; description: string }) => {
    console.log(`  - ${step.id}: ${step.description}`);
  });

  console.log(`\n[ABB] Artifacts to be created:`);
  abb.implementation_block.steps.forEach((step: { artifacts?: string[] }) => {
    step.artifacts?.forEach((artifact: string) => {
      console.log(`  - ${artifact}`);
    });
  });

  // Step 3: Verify routing rules configuration
  const routingRulesPath = path.join(__dirname, "../../..", "config/token-economy/routing_rules.yaml");
  if (!fs.existsSync(routingRulesPath)) {
    console.log(`\n[ABB] Creating baseline routing rules configuration...`);
    const routingRulesDir = path.dirname(routingRulesPath);
    fs.mkdirSync(routingRulesDir, { recursive: true });
    // Routing rules will be populated in subsequent steps
    console.log(`[ABB] Routing rules directory ready: ${routingRulesDir}`);
  }

  console.log(`\n[ABB] ✅ Execution complete. Artifacts ready for implementation.`);
  console.log(`[ABB] Next: Generate telemetry schemas, emitters, and CodeBurn provider.`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`Usage: cic-cli run-abb [plan|execute] --id ${ABB_ID}`);
    process.exit(1);
  }

  const command = args[0];
  const idArg = args.findIndex((arg) => arg === "--id");

  if (idArg === -1 || args[idArg + 1] !== ABB_ID) {
    console.error(`Error: Invalid ABB ID. Expected: ${ABB_ID}`);
    process.exit(1);
  }

  switch (command) {
    case "plan":
      cmdPlan();
      break;
    case "execute":
      cmdExecute();
      break;
    default:
      console.error(`Error: Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
