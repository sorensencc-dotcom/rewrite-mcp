import fs from "node:fs";
import path from "node:path";

interface Site {
  id: string;
  url: string;
}

interface RenderResult {
  renderer: string;
  durationMs: number;
  size: number;
}

// Stub implementations — wire to your actual renderers
async function renderWithObscura(url: string): Promise<string> {
  console.warn(
    `[renderBenchmark] Obscura not implemented — skipping ${url}`
  );
  return "";
}

async function renderWithLightpanda(url: string): Promise<string> {
  console.warn(
    `[renderBenchmark] Lightpanda not implemented — skipping ${url}`
  );
  return "";
}

async function benchRenderer(
  label: string,
  fn: (url: string) => Promise<string>,
  site: Site
): Promise<RenderResult | null> {
  try {
    const start = Date.now();
    const html = await fn(site.url);
    const durationMs = Date.now() - start;

    if (!html) return null;

    const outDir = "benchmarks/out/render";
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `${site.id}.${label}.html`),
      html,
      "utf8"
    );

    return { renderer: label, durationMs, size: html.length };
  } catch (err) {
    console.error(`✗ ${site.id} [${label}]:`, (err as Error).message);
    return null;
  }
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log(
    `[renderBenchmark] Comparing Obscura vs Lightpanda on ${sites.length} sites...\n`
  );

  const results: any[] = [];

  for (const site of sites) {
    console.log(`[${site.id}] Benchmarking renderers...`);

    const obscura = await benchRenderer(
      "obscura",
      renderWithObscura,
      site
    );
    const lightpanda = await benchRenderer(
      "lightpanda",
      renderWithLightpanda,
      site
    );

    if (obscura || lightpanda) {
      results.push({
        id: site.id,
        url: site.url,
        obscura,
        lightpanda,
      });

      if (obscura) {
        console.log(`  ✓ Obscura: ${obscura.durationMs}ms`);
      }
      if (lightpanda) {
        console.log(`  ✓ Lightpanda: ${lightpanda.durationMs}ms`);
      }
    }

    console.log("");
  }

  const outDir = "benchmarks/out";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    `${outDir}/render-results.json`,
    JSON.stringify(results, null, 2)
  );

  console.log(`[renderBenchmark] Results saved → ${outDir}/render-results.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
