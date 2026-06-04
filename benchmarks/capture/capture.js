import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const sites = JSON.parse(
  fs.readFileSync(path.resolve("benchmarks/sites.json"), "utf8")
);

async function captureSite(browser, site) {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36"
  );

  console.log(`[${new Date().toISOString()}] Capturing ${site.id} → ${site.url}`);

  try {
    await page.goto(site.url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const html = await page.content();

    const inputDir = path.dirname(path.resolve(site.htmlPath));
    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true });
    }

    fs.writeFileSync(path.resolve(site.htmlPath), html, "utf8");

    console.log(`✓ Saved ${site.id} → ${site.htmlPath}`);
  } catch (err) {
    console.error(`✗ Failed to capture ${site.id}:`, err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  console.log("[Rewrite Labs] Starting benchmark corpus capture...\n");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const site of sites) {
    await captureSite(browser, site);
  }

  await browser.close();

  console.log(
    "\n[Rewrite Labs] Capture complete. Next: fill in context.json files."
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
