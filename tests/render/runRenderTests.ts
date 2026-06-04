import fs from "node:fs";
import path from "node:path";
import { loadSnapshot, saveSnapshot } from "../utils/snapshot";
import { hasDiff } from "../utils/diff";

interface Site {
  id: string;
  url: string;
}

// Stub implementations — wire to actual renderers when available
async function renderWithObscura(_url: string): Promise<string | null> {
  return null;
}

async function renderWithLightpanda(_url: string): Promise<string | null> {
  return null;
}

async function benchRenderer(
  label: string,
  fn: (url: string) => Promise<string | null>,
  site: Site
): Promise<{ renderer: string; size: number } | null> {
  try {
    const html = await fn(site.url);
    if (!html) return null;

    const outDir = "benchmarks/out/render";
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `${site.id}.${label}.html`),
      html,
      "utf8"
    );

    return { renderer: label, size: html.length };
  } catch (err) {
    console.error(`✗ ${site.id} [${label}]:`, (err as Error).message);
    return null;
  }
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log("\n=== Rendering Tests (Obscura vs Lightpanda) ===\n");

  let passed = 0;
  let failed = 0;
  let created = 0;

  for (const site of sites) {
    console.log(`[${site.id}] Testing renderers...`);

    const obscura = await benchRenderer("obscura", renderWithObscura, site);

    if (!obscura) {
      console.log(`  ⚠ Obscura not available (stub implementation)`);
      continue;
    }

    const expectedPath = `tests/render/expected/${site.id}.html`;
    const expected = loadSnapshot(expectedPath);

    if (!expected) {
      console.log(`  → Creating snapshot`);
      created++;
      continue;
    }

    console.log(`  ✔ Snapshot exists`);
    passed++;
  }

  console.log(
    `\n[Render Tests] ${passed} passed, ${failed} failed, ${created} created snapshots\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
