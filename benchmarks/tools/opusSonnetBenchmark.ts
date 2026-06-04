import fs from "node:fs";
import path from "node:path";
import { Anthropic } from "@anthropic-ai/sdk";
import { logAnthropicCall } from "../costs/system";
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport } from "../costs/reports/generate";
import { writeHelmDashboardReport } from "../costs/reports/helm";

interface Site {
  id: string;
  htmlPath: string;
  contextPath: string;
}

interface RewriteResult {
  text: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Anthropic pricing (as of June 2026)
const PRICING = {
  "claude-sonnet-4-6": {
    inputPerMTok: 3,
    outputPerMTok: 15,
  },
  "claude-opus-4-8": {
    inputPerMTok: 15,
    outputPerMTok: 60,
  },
};

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return inputCost + outputCost;
}

function buildRewritePrompt(html: string, context: any): string {
  return `You are a web design expert. Rewrite the following HTML to be modern, accessible, and conversion-optimized.

Business Name: ${context.businessName}
Address: ${context.address}
Phone: ${context.phone}
Services: ${context.services.join(", ")}

Original HTML:
${html}

Provide only the rewritten HTML, no explanations.`;
}

async function runRewrite(
  model: string,
  html: string,
  context: any
): Promise<RewriteResult> {
  const prompt = buildRewritePrompt(html, context);
  const start = Date.now();

  const res = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const durationMs = Date.now() - start;
  const text =
    res.content[0].type === "text" ? res.content[0].text : "";
  const inputTokens = res.usage.input_tokens;
  const outputTokens = res.usage.output_tokens;
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  return {
    text,
    durationMs,
    inputTokens,
    outputTokens,
    costUsd,
  };
}

async function main() {
  const sitesPath = path.resolve("benchmarks/sites.json");
  const sites: Site[] = JSON.parse(fs.readFileSync(sitesPath, "utf8"));

  console.log(`[opusSonnetBenchmark] Running A/B test on ${sites.length} sites...\n`);

  const results: any[] = [];
  const outDir = "benchmarks/out";
  fs.mkdirSync(outDir, { recursive: true });

  let totalCostUsd = 0;
  let sitesProcessed = 0;

  for (const site of sites) {
    const htmlPath = path.resolve(site.htmlPath);
    const contextPath = path.resolve(site.contextPath);

    if (!fs.existsSync(htmlPath)) {
      console.warn(`⚠ Skipping ${site.id}: HTML not captured`);
      continue;
    }

    const html = fs.readFileSync(htmlPath, "utf8");
    const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));

    console.log(`[${site.id}] Running Sonnet...`);
    const sonnet = await runRewrite("claude-sonnet-4-6", html, context);

    logAnthropicCall({
      model: "claude-sonnet-4-6",
      source: "benchmark",
      inputTokens: sonnet.inputTokens,
      outputTokens: sonnet.outputTokens,
      costModel: "direct",
      metadata: { site: site.id, taskType: "rewrite", phase: 48 },
    });

    console.log(`[${site.id}] Running Opus...`);
    const opus = await runRewrite("claude-opus-4-8", html, context);

    logAnthropicCall({
      model: "claude-opus-4-8",
      source: "benchmark",
      inputTokens: opus.inputTokens,
      outputTokens: opus.outputTokens,
      costModel: "direct",
      metadata: { site: site.id, taskType: "rewrite", phase: 48 },
    });

    fs.writeFileSync(`${outDir}/${site.id}.sonnet.html`, sonnet.text);
    fs.writeFileSync(`${outDir}/${site.id}.opus.html`, opus.text);

    const siteCostUsd = sonnet.costUsd + opus.costUsd;
    totalCostUsd += siteCostUsd;
    sitesProcessed++;

    results.push({
      id: site.id,
      sonnet: {
        durationMs: sonnet.durationMs,
        inputTokens: sonnet.inputTokens,
        outputTokens: sonnet.outputTokens,
        costUsd: sonnet.costUsd,
      },
      opus: {
        durationMs: opus.durationMs,
        inputTokens: opus.inputTokens,
        outputTokens: opus.outputTokens,
        costUsd: opus.costUsd,
      },
    });

    console.log(
      `✓ ${site.id}: Sonnet ${sonnet.durationMs}ms ($${sonnet.costUsd.toFixed(4)}), Opus ${opus.durationMs}ms ($${opus.costUsd.toFixed(4)}) | Site total: $${siteCostUsd.toFixed(4)}\n`
    );
  }

  fs.writeFileSync(
    `${outDir}/benchmark-results.json`,
    JSON.stringify(results, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log(`[opusSonnetBenchmark] Benchmark Complete`);
  console.log("=".repeat(60));
  console.log(`Sites processed: ${sitesProcessed}/${sites.length}`);
  console.log(`Total API cost: $${totalCostUsd.toFixed(2)}`);
  console.log(`Average cost per site: $${(totalCostUsd / sitesProcessed).toFixed(2)}`);
  console.log(`Results saved → ${outDir}/benchmark-results.json`);
  console.log("=".repeat(60) + "\n");

  // Generate cost reports
  console.log("[opusSonnetBenchmark] Generating cost reports...");
  const dailyReport = generateDailyReport();
  const weeklyReport = generateWeeklyReport();
  const monthlyReport = generateMonthlyReport();
  const helmDashboard = writeHelmDashboardReport();

  console.log(
    `Daily report: $${dailyReport.totalRealUsd.toFixed(2)} real, $${dailyReport.totalImpliedUsd.toFixed(2)} implied`
  );
  console.log(
    `Weekly report: $${weeklyReport.totalRealUsd.toFixed(2)} real, $${weeklyReport.totalImpliedUsd.toFixed(2)} implied`
  );
  console.log(
    `Monthly report: $${monthlyReport.totalRealUsd.toFixed(2)} real, $${monthlyReport.totalImpliedUsd.toFixed(2)} implied`
  );
  console.log(`Helm dashboard: ${helmDashboard.today.totalRealUsd.toFixed(2)} today`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
