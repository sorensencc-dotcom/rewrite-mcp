import fs from "node:fs";
import path from "node:path";

interface Site {
  id: string;
}

interface Status {
  id: string;
  rewrite: boolean;
  render: boolean;
  stc: boolean;
  metadata: boolean;
}

function exists(p: string): boolean {
  return fs.existsSync(path.resolve(p));
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  const statuses: Status[] = [];

  for (const site of sites) {
    statuses.push({
      id: site.id,
      rewrite: exists(`tests/rewrite/expected/${site.id}.html`),
      render: exists(`tests/render/expected/${site.id}.html`),
      stc: exists(`tests/stc/expected/${site.id}.html`),
      metadata: exists(`tests/metadata/expected/${site.id}.json`),
    });
  }

  fs.mkdirSync("benchmarks/out", { recursive: true });
  fs.writeFileSync(
    "benchmarks/out/status.json",
    JSON.stringify(statuses, null, 2),
    "utf8"
  );

  console.log(`[generateStatus] Wrote status for ${statuses.length} sites`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
