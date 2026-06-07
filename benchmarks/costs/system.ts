import { CostEntry, Provider, Source, CostModel, estimateDirectCostUsd } from "./models";
import { impliedSubscriptionRatePerToken, SUBSCRIPTIONS } from "./subscriptions";
import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const COST_LOG_PATH = join(process.cwd(), "benchmarks", "costs", "costLog.json");

function ensureLogFile() {
  const dir = join(process.cwd(), "benchmarks", "costs");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(COST_LOG_PATH)) {
    writeFileSync(COST_LOG_PATH, "[]", "utf8");
  }
}

export function readCostLog(): CostEntry[] {
  ensureLogFile();
  try {
    const data = readFileSync(COST_LOG_PATH, "utf8");
    return JSON.parse(data) as CostEntry[];
  } catch {
    return [];
  }
}

function writeCostLog(entries: CostEntry[]) {
  ensureLogFile();
  writeFileSync(COST_LOG_PATH, JSON.stringify(entries, null, 2), "utf8");
}

export function logCost(
  entry: Omit<CostEntry, "amountUsd" | "impliedCostUsd" | "timestamp">
) {
  ensureLogFile();

  const fullEntry: CostEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    amountUsd: computeAmountUsd(entry),
    impliedCostUsd: computeImpliedCostUsd(entry),
  };

  const log = readCostLog();
  log.push(fullEntry);
  writeCostLog(log);
}

function computeAmountUsd(
  e: Omit<CostEntry, "amountUsd" | "impliedCostUsd" | "timestamp">
): number | null {
  if (e.costModel === "direct" || e.costModel === "overage") {
    return estimateDirectCostUsd(e.provider, e.model, e.inputTokens, e.outputTokens);
  }
  if (
    e.costModel === "free" ||
    e.costModel === "local" ||
    e.costModel === "subscription"
  ) {
    return null;
  }
  return null;
}

function computeImpliedCostUsd(
  e: Omit<CostEntry, "amountUsd" | "impliedCostUsd" | "timestamp">
): number {
  if (e.costModel === "subscription") {
    const tierKey =
      e.source === "cli:claude-code"
        ? "claude-pro"
        : e.source === "api:direct" && e.provider === "google"
          ? "gemini-advanced"
          : e.source === "cli:copilot"
            ? "copilot-free"
            : null;

    if (!tierKey || !(tierKey in SUBSCRIPTIONS)) return 0;
    const rate = impliedSubscriptionRatePerToken(tierKey);
    return rate * (e.inputTokens + e.outputTokens);
  }

  if (e.costModel === "local" && e.provider === "ollama") {
    return estimateDirectCostUsd(
      "anthropic",
      "claude-sonnet-4-6",
      e.inputTokens,
      e.outputTokens
    );
  }

  if (e.costModel === "direct" || e.costModel === "overage") {
    return computeAmountUsd(e) ?? 0;
  }

  return 0;
}

export function logAnthropicCall(params: {
  model: string;
  source: Source;
  inputTokens: number;
  outputTokens: number;
  costModel: CostModel;
  metadata?: CostEntry["metadata"];
}) {
  logCost({
    provider: "anthropic",
    ...params,
  });
}

export function logGeminiCall(params: {
  model: string;
  source: Source;
  inputTokens: number;
  outputTokens: number;
  costModel: CostModel;
  metadata?: CostEntry["metadata"];
}) {
  logCost({
    provider: "google",
    ...params,
  });
}

export function logCopilotCall(params: {
  model: string;
  source: Source;
  inputTokens: number;
  outputTokens: number;
  metadata?: CostEntry["metadata"];
}) {
  logCost({
    provider: "microsoft",
    costModel: "free",
    ...params,
  });
}

export function logOllamaCall(params: {
  model: string;
  source: Source;
  inputTokens: number;
  outputTokens: number;
  metadata?: CostEntry["metadata"];
}) {
  logCost({
    provider: "ollama",
    costModel: "local",
    ...params,
  });
}
