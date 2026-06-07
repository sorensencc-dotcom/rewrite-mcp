import fs from "node:fs";
import path from "node:path";
import { loadSnapshot, saveSnapshot } from "../utils/snapshot.ts";
import { diffStrings, hasDiff } from "../utils/diff.ts";

interface Site {
  id: string;
  htmlPath: string;
  contextPath: string;
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log("\n=== Metadata Extraction Tests ===\n");

  let passed = 0;
  let failed = 0;

  for (const site of sites) {
    const contextPath = path.resolve(site.contextPath);

    if (!fs.existsSync(contextPath)) {
      console.warn(`⚠ Skipping ${site.id}: context not extracted`);
      continue;
    }

    const actual = fs.readFileSync(contextPath, "utf8");
    const expectedPath = `tests/metadata/expected/${site.id}.json`;
    const expected = loadSnapshot(expectedPath);

    if (!expected) {
      console.log(`[${site.id}] → Creating snapshot`);
      saveSnapshot(expectedPath, actual);
      continue;
    }

    if (hasDiff(expected, actual)) {
      const diff = diffStrings(expected, actual);
      console.log(`[${site.id}] ❌ Diff:\n${diff.split("\n").slice(0, 5).join("\n")}...`);
      failed++;
    } else {
      console.log(`[${site.id}] ✔ Pass`);
      passed++;
    }
  }

  console.log(`\n[Metadata Tests] ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
