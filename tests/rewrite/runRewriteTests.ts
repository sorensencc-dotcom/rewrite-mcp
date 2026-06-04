import fs from "node:fs";
import path from "node:path";
import { Anthropic } from "@anthropic-ai/sdk";
import { loadSnapshot, saveSnapshot } from "../utils/snapshot";
import { diffStrings, hasDiff } from "../utils/diff";

interface Site {
  id: string;
  htmlPath: string;
  contextPath: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildRewritePrompt(html: string, context: any): string {
  return `You are a web design expert. Rewrite the following HTML to be modern, accessible, and conversion-optimized.

Business Name: ${context.businessName}
Address: ${context.address}
Phone: ${context.phone}

Original HTML (first 5000 chars):
${html.slice(0, 5000)}

Provide only the rewritten HTML, no explanations.`;
}

async function runRewrite(model: string, html: string, context: any): Promise<string> {
  const res = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: buildRewritePrompt(html, context) }],
  });

  return res.content[0].type === "text" ? res.content[0].text : "";
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log("\n=== Rewrite Tests (Opus vs Sonnet) ===\n");

  let passed = 0;
  let failed = 0;
  let created = 0;

  for (const site of sites) {
    const htmlPath = path.resolve(site.htmlPath);
    const contextPath = path.resolve(site.contextPath);

    if (!fs.existsSync(htmlPath)) {
      console.warn(`⚠ Skipping ${site.id}: HTML not captured`);
      continue;
    }

    const html = fs.readFileSync(htmlPath, "utf8");
    const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));

    console.log(`[${site.id}] Running Opus rewrite...`);
    const opus = await runRewrite("claude-opus-4.8", html, context);

    const expectedPath = `tests/rewrite/expected/${site.id}.html`;
    const expected = loadSnapshot(expectedPath);

    if (!expected) {
      console.log(`  → Creating snapshot`);
      saveSnapshot(expectedPath, opus);
      created++;
      continue;
    }

    if (hasDiff(expected, opus)) {
      const diff = diffStrings(expected, opus);
      console.log(`  ❌ Diff detected:\n${diff.split("\n").slice(0, 5).join("\n")}...`);
      failed++;
    } else {
      console.log(`  ✔ Pass`);
      passed++;
    }
  }

  console.log(
    `\n[Rewrite Tests] ${passed} passed, ${failed} failed, ${created} created snapshots\n`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
