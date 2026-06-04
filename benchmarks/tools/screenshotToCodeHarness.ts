import fs from "node:fs";
import path from "node:path";

interface Site {
  id: string;
}

const STC_ENDPOINT =
  process.env.STC_ENDPOINT || "http://localhost:8000/api/convert";

async function runScreenshotToCode(site: Site): Promise<boolean> {
  const imgPath = path.resolve(`benchmarks/input/${site.id}.png`);

  if (!fs.existsSync(imgPath)) {
    console.warn(`⚠ Skipping ${site.id}: missing screenshot at ${imgPath}`);
    return false;
  }

  try {
    console.log(`[${site.id}] Sending to screenshot-to-code...`);

    const img = fs.readFileSync(imgPath);

    // Using fetch API (Node 18+)
    const res = await fetch(STC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: img,
    });

    if (!res.ok) {
      console.error(
        `✗ ${site.id}: ${res.status} ${res.statusText}`
      );
      return false;
    }

    const html = await res.text();
    const outDir = "benchmarks/out/stc";
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${site.id}.stc.html`), html, "utf8");

    console.log(`✓ ${site.id} → ${outDir}/${site.id}.stc.html`);
    return true;
  } catch (err) {
    console.error(`✗ ${site.id}:`, (err as Error).message);
    return false;
  }
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log(
    `[screenshotToCodeHarness] Running on ${sites.length} sites...\n`
  );
  console.log(`Target endpoint: ${STC_ENDPOINT}\n`);

  let succeeded = 0;
  let skipped = 0;

  for (const site of sites) {
    const ok = await runScreenshotToCode(site);
    if (ok) succeeded++;
    else skipped++;
  }

  console.log(
    `\n[screenshotToCodeHarness] Complete: ${succeeded} succeeded, ${skipped} skipped`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
