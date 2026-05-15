#!/usr/bin/env node
/**
 * CIC Assembler
 * Castironforge — Rewrite Labs
 *
 * Purpose:
 *   Materialize the CIC subsystem from the super‑manifest into:
 *
 *     castironforge/src/cic/
 *
 * Behavior:
 *   - Creates directories as needed
 *   - Writes files deterministically
 *   - Overwrites safely
 *   - Logs operator‑grade progress
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cicManifest } from "./cic-super.mjs";

// Resolve script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target root inside Castironforge
const CIC_ROOT = path.resolve(__dirname, "../src/cic");

function log(msg) {
  process.stdout.write(msg + "\n");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(CIC_ROOT, relPath);

  // Ensure directory exists
  ensureDir(path.dirname(fullPath));

  // Write file
  fs.writeFileSync(fullPath, content, "utf8");
}

async function main() {
  log("=== CIC ASSEMBLER START ===");

  // Ensure CIC root exists
  ensureDir(CIC_ROOT);

  // Write all manifest files
  for (const [rel, content] of Object.entries(cicManifest)) {
    writeFile(rel, content);
  }

  log("=== CIC ASSEMBLER COMPLETE ===");
}

main().catch(err => {
  console.error("CIC ASSEMBLER ERROR:", err);
  process.exit(1);
});
