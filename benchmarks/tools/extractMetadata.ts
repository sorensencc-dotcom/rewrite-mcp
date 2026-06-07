import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

interface Site {
  id: string;
  htmlPath: string;
  contextPath: string;
}

interface Context {
  businessName: string;
  address: string;
  phone: string;
  services: string[];
  about: string;
  cta: string;
  notes: string;
}

function extractText($: cheerio.CheerioAPI, selector: string): string {
  return $(selector).first().text().trim();
}

function extractPhone(html: string): string {
  const match = html.match(
    /(\+1[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/
  );
  return match ? match[0] : "";
}

function extractServices($: cheerio.CheerioAPI): string[] {
  const candidates = ["ul li", ".services li", ".service-list li"];
  const items = new Set<string>();

  for (const sel of candidates) {
    $(sel).each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 0 && t.length < 120) {
        items.add(t);
      }
    });
    if (items.size > 0) break;
  }

  return Array.from(items);
}

function extractCta($: cheerio.CheerioAPI): string {
  const candidates = ["a", "button", "input[type=submit]"];
  const keywords = [
    "schedule",
    "book",
    "call",
    "contact",
    "get started",
    "free estimate",
    "appointment",
  ];

  for (const sel of candidates) {
    const elems = $(sel).toArray();
    for (const el of elems) {
      const t = $(el).text().trim().toLowerCase();
      if (!t) continue;
      if (keywords.some((k) => t.includes(k))) {
        return $(el).text().trim();
      }
    }
  }

  return "";
}

function extractBusinessName($: cheerio.CheerioAPI): string {
  const title = $("title").first().text().trim();
  if (title) {
    return title.split("|")[0].split("–")[0].trim();
  }
  const h1 = $("h1").first().text().trim();
  return h1 || "";
}

function extractAddress(html: string): string {
  const match = html.match(
    /\d{2,5}[^<\n]+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Lane|Ln\.|Drive|Dr\.)[^<\n]*/i
  );
  return match ? match[0].trim() : "";
}

function extractAbout($: cheerio.CheerioAPI): string {
  const selectors = [
    "section[id*=about]",
    "section[class*=about]",
    "div[id*=about]",
    "div[class*=about]",
  ];

  for (const sel of selectors) {
    const t = $(sel).text().trim();
    if (t && t.length > 80) {
      return t.slice(0, 600);
    }
  }

  const p = $("p")
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);
  return p.slice(0, 3).join(" ").slice(0, 600);
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log(`[extractMetadata] Processing ${sites.length} sites...\n`);

  for (const site of sites) {
    const htmlPath = path.resolve(site.htmlPath);

    if (!fs.existsSync(htmlPath)) {
      console.warn(`⚠ Skipping ${site.id}: HTML not captured yet`);
      continue;
    }

    const html = fs.readFileSync(htmlPath, "utf8");
    const $ = cheerio.load(html);

    const businessName = extractBusinessName($);
    const phone = extractPhone(html);
    const address = extractAddress(html);
    const services = extractServices($);
    const cta = extractCta($);
    const about = extractAbout($);

    const context: Context = {
      businessName,
      address,
      phone,
      services,
      about,
      cta,
      notes: "Auto-generated; review and adjust as needed.",
    };

    const contextPath = path.resolve(site.contextPath);
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), "utf8");

    console.log(`✓ ${site.id}`);
  }

  console.log(`\n[extractMetadata] Complete`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
