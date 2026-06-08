/**
 * File: crc32-determinism.test.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 *
 * Operator-grade determinism validation.
 * Verifies Repomix output is bit-for-bit identical across 10 runs.
 */

import { spawn } from "child_process";
import { readFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import crc32 from "crc-32";

const FIXTURE_REPO = join(__dirname, "..", "fixtures", "sample-repo");
const TMP_DIR = join(__dirname, "..", "tmp");
const OUT_PATH = join(TMP_DIR, "packed.json");
const RUNS = 10;

function ensureTmpDir() {
  mkdirSync(TMP_DIR, { recursive: true });
}

function runRepomix(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Clean output file before each run
    rmSync(OUT_PATH, { force: true });

    const proc = spawn(
      "repomix",
      ["--style", "json", "--token-count-tree", "--output", OUT_PATH],
      {
        cwd: FIXTURE_REPO,
        shell: true,
        stdio: "inherit",
      }
    );

    proc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Repomix exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Repomix spawn error: ${err.message}`));
    });
  });
}

function computeCRC32(filePath: string): number {
  const buf = readFileSync(filePath);
  return crc32.buf(buf);
}

async function main() {
  ensureTmpDir();

  console.log(`\n🔍 Repomix Determinism Validation (${RUNS} runs)`);
  console.log(`📂 Fixture: ${FIXTURE_REPO}`);
  console.log(`📝 Output: ${OUT_PATH}\n`);

  const hashes: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < RUNS; i++) {
    try {
      process.stdout.write(`Run ${String(i + 1).padStart(2, " ")}/${RUNS}: `);

      await runRepomix();

      const hash = computeCRC32(OUT_PATH);
      hashes.push(hash);

      console.log(`CRC32=${hash.toString(16).padStart(8, "0")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Run ${i + 1}: ${msg}`);
      console.log(`❌ ERROR`);
    }
  }

  console.log("\n");

  if (errors.length > 0) {
    console.error("❌ Execution errors detected:");
    errors.forEach((e) => console.error(`   ${e}`));
    process.exit(1);
  }

  // Validate all hashes match
  const first = hashes[0];
  const allMatch = hashes.every((h) => h === first);

  if (!allMatch) {
    console.error("❌ DETERMINISM FAILED: CRC32 mismatch detected\n");
    hashes.forEach((h, i) => {
      const match = h === first ? "✓" : "✗";
      console.error(`   Run ${String(i + 1).padStart(2, " ")}: ${match} ${h.toString(16).padStart(8, "0")}`);
    });
    process.exit(1);
  }

  console.log(
    `✅ DETERMINISM PASSED: All ${RUNS} CRC32 hashes match (${first.toString(16).padStart(8, "0")})\n`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ Determinism harness error:`, err);
  process.exit(1);
});
