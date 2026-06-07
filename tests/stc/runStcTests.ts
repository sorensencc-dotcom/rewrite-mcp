import fs from "node:fs";
import path from "node:path";
import { loadSnapshot, saveSnapshot } from "../utils/snapshot.ts";
import { hasDiff } from "../utils/diff.ts";

interface Site {
  id: string;
}

const STC_ENDPOINT = process.env.STC_ENDPOINT || "http://localhost:8000/api/convert";

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log("\n=== Screenshot-to-Code Tests ===\n");

  let passed = 0;
  let skipped = 0;
  let created = 0;

  for (const site of sites) {
    const imgPath = `benchmarks/input/${site.id}.png`;

    if (!fs.existsSync(imgPath)) {
      console.log(`⚠ Skipping ${site.id}: screenshot not available`);
      skipped++;
      continue;
    }

    try {
      const img = fs.readFileSync(imgPath);
      console.log(`[${site.id}] Sending to screenshot-to-code...`);

      const res = await fetch(STC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: img,
      });

      if (!res.ok) {
        console.error(`  ✗ ${res.status} ${res.statusText}`);
        continue;
      }

      const html = await res.text();
      const expectedPath = `tests/stc/expected/${site.id}.html`;
      const expected = loadSnapshot(expectedPath);

      if (!expected) {
        console.log(`  → Creating snapshot`);
        saveSnapshot(expectedPath, html);
        created++;
        continue;
      }

      if (hasDiff(expected, html)) {
        console.log(`  ❌ Diff detected`);
      } else {
        console.log(`  ✔ Pass`);
        passed++;
      }
    } catch (err) {
      console.error(`✗ ${site.id}:`, (err as Error).message);
    }
  }

  console.log(
    `\n[STC Tests] ${passed} passed, ${skipped} skipped, ${created} created snapshots\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
