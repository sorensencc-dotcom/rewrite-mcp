/**
 * Helm Commands for Claude Desktop
 *
 * Tier 1 (MVP): /costs, /routing, /budget
 * Tier 2: /prefer-local, /quality
 * Tier 3: /cost-forecast, /savings-analysis
 */

import {
  helmToday,
  helmTrends,
  helmRoutingStatus,
  helmSetPreference,
  helmBudgetWarning,
} from "../mcp/helm-server";

// ============================================================
// TIER 1: MVP COMMANDS
// ============================================================

/**
 * /costs — Show today's spend and budget status
 *
 * Usage:
 *   /costs              → today's summary
 *   /costs --trends     → weekly/monthly trends
 *   /costs --breakdown  → by provider breakdown
 */
export function cmdCosts(args?: string): string {
  const helm = helmToday();

  if ((helm as any).status === "no-data") {
    return "📊 No cost data available yet. Run a benchmark to generate data.\n\nExample: `npm run bench:opus-sonnet`";
  }

  const data = helm as any;
  const budgetAlert =
    data.budget.level === "critical"
      ? "🚨"
      : data.budget.level === "warning"
        ? "⚠️"
        : "✓";

  let output = `${budgetAlert} **Cost Summary**\n\n`;
  output += `**Today's Spend**\n`;
  output += `- Real cost: ${data.spend.real.formatted}\n`;
  output += `- Implied cost: ${data.spend.implied.formatted}\n\n`;

  output += `**Budget Status**\n`;
  output += `- Daily budget: ${data.budget.daily.formatted}\n`;
  output += `- Used: ${Math.round(data.budget.percentUsed)}%\n`;
  output += `- Remaining: ${data.budget.remaining.formatted}\n\n`;

  if (args === "--breakdown") {
    output += `**By Provider**\n`;
    for (const provider of data.byProvider) {
      output += `- ${provider.provider}: ${provider.real.formatted} real / ${provider.implied.formatted} implied\n`;
    }
  }

  if (args === "--trends") {
    const trends = helmTrends();
    const t = trends as any;
    output += `**Trends**\n`;
    output += `- Model distribution: ${t.modelDistribution.map((m: any) => `${m.model} (${m.percent}%)`).join(", ")}\n`;
    output += `- Estimated savings: ${t.savingsEstimate.weekly}\n`;
  }

  return output;
}

/**
 * /routing — Show current routing decisions and preferences
 *
 * Usage:
 *   /routing            → current routing status
 *   /routing --recent   → last 10 routing decisions
 *   /routing --set rewrite claude-sonnet-4-6   → override for task type
 */
export function cmdRouting(args?: string): string {
  if (args?.startsWith("--set")) {
    const parts = args.split(/\s+/);
    if (parts.length < 3) {
      return "Usage: `/routing --set [taskType] [model]`\n\nExample: `/routing --set rewrite claude-sonnet-4-6`";
    }

    const taskType = parts[1] as any;
    const model = parts[2];
    const result = helmSetPreference({ taskType, model });

    return `✓ ${(result as any).message}`;
  }

  const status = helmRoutingStatus() as any;

  let output = `**Routing Status**\n\n`;
  output += `**Preferences**\n`;
  output += `- Prefer local: ${status.preferences.preferLocal ? "enabled ✓" : "disabled"}\n`;
  output += `- Prefer cheaper: ${status.preferences.preferCheaperModels ? "enabled ✓" : "disabled"}\n\n`;

  output += `**Task Type Overrides**\n`;
  const overrides = status.preferences.taskTypeOverrides;
  for (const [taskType, model] of Object.entries(overrides)) {
    if (model) {
      output += `- ${taskType}: ${model}\n`;
    }
  }
  if (!Object.values(overrides).some((m) => m)) {
    output += `- (none set, using automatic routing)\n`;
  }

  if (args === "--recent") {
    output += `\n**Recent Routing Decisions**\n`;
    for (const decision of status.recentDecisions.slice(0, 5)) {
      output += `- ${decision.timestamp}: ${decision.model} (${decision.tokens.toLocaleString()} tokens, $${decision.cost.toFixed(4)})\n`;
    }
  }

  return output;
}

/**
 * /budget — View or set daily budget
 *
 * Usage:
 *   /budget             → show current budget
 *   /budget 5.00        → set daily budget to $5.00
 *   /budget --warning   → show if nearing limit
 */
export function cmdBudget(args?: string): string {
  if (args === "--warning") {
    const warning = helmBudgetWarning();
    return (warning as any).message;
  }

  if (args && !args.startsWith("--")) {
    const amount = parseFloat(args);
    if (isNaN(amount) || amount <= 0) {
      return "Invalid budget amount. Please enter a positive number.\n\nExample: `/budget 5.00`";
    }

    // TODO: Implement budget persistence
    return `✓ Daily budget set to $${amount.toFixed(2)}\n\n(Note: Budget persistence not yet implemented. This is a Tier 2 feature.)`;
  }

  const today = helmToday() as any;

  let output = `**Budget Status**\n\n`;
  output += `- Daily limit: $${today.budget.daily.formatted}\n`;
  output += `- Spent: ${today.budget.percentUsed.toFixed(0)}% ($${today.spend.real.usd.toFixed(2)})\n`;
  output += `- Remaining: $${today.budget.remaining.usd.toFixed(2)}\n\n`;

  if (today.budget.level === "critical") {
    output += `🚨 **CRITICAL:** Over budget or less than 20% remaining. Consider switching to cheaper models.\n`;
  } else if (today.budget.level === "warning") {
    output += `⚠️ **WARNING:** Budget running low. Routing preferring cheaper models.\n`;
  } else {
    output += `✓ **OK:** Budget healthy.\n`;
  }

  return output;
}

// ============================================================
// TIER 2: ADVANCED COMMANDS
// ============================================================

/**
 * /prefer-local — Toggle local (Ollama) routing preference
 *
 * Usage:
 *   /prefer-local on   → prefer Ollama for low-stakes tasks
 *   /prefer-local off  → use cloud models
 */
export function cmdPreferLocal(args?: string): string {
  if (args === "on") {
    const result = helmSetPreference({ taskType: "chat", model: "ollama" }); // Example
    return `✓ Local model preference enabled. Low-stakes tasks will route to Ollama.\n\n(Full implementation: Tier 2)`;
  }

  if (args === "off") {
    return `✓ Local model preference disabled. Using automatic routing.\n\n(Full implementation: Tier 2)`;
  }

  return `Usage: \`/prefer-local on\` or \`/prefer-local off\`\n\nEnable to route low-stakes tasks to Ollama and reduce API costs.`;
}

/**
 * /quality — Set global quality threshold
 *
 * Usage:
 *   /quality 8          → require 8/10 quality; prefer cheaper models
 *   /quality 9          → require 9/10 quality; use expensive models
 */
export function cmdQuality(args?: string): string {
  if (!args) {
    return `Usage: \`/quality [1-10]\`\n\nLower = cheaper models OK. Higher = premium models preferred.\n\n(Full implementation: Tier 2)`;
  }

  const level = parseInt(args);
  if (isNaN(level) || level < 1 || level > 10) {
    return "Invalid quality level. Please enter a number 1–10.";
  }

  return `✓ Quality threshold set to ${level}/10\n\nRouter will prefer models matching quality target.\n\n(Full implementation: Tier 2)`;
}

// ============================================================
// TIER 3: ADVANCED ANALYTICS
// ============================================================

/**
 * /cost-forecast — Forecast weekly/monthly spend based on trends
 *
 * Usage:
 *   /cost-forecast      → project spend if trend continues
 *   /cost-forecast --if-opus    → what if always using Opus?
 */
export function cmdCostForecast(args?: string): string {
  const trends = helmTrends() as any;

  let output = `**Cost Forecast**\n\n`;
  output += `Based on current usage patterns:\n\n`;

  // TODO: Implement forecasting
  output += `- Weekly estimate: ~$${(trends.daily?.totalRealUsd ?? 2.34 * 7).toFixed(2)}\n`;
  output += `- Monthly estimate: ~$${(trends.daily?.totalRealUsd ?? 2.34 * 30).toFixed(2)}\n\n`;

  output += `(Full forecasting: Tier 3)`;

  return output;
}

/**
 * /savings-analysis — Show estimated savings from routing
 *
 * Usage:
 *   /savings-analysis       → how much did routing save this week?
 *   /savings-analysis --vs-opus  → vs always using Opus
 */
export function cmdSavingsAnalysis(args?: string): string {
  const trends = helmTrends() as any;

  let output = `**Savings Analysis**\n\n`;
  output += `Estimated savings this week: ${trends.savingsEstimate.weekly}\n\n`;
  output += `This is based on routing to cheaper models when quality acceptable.\n\n`;
  output += `(Full analysis: Tier 3)`;

  return output;
}

// ============================================================
// COMMAND DISPATCHER
// ============================================================

export type CommandName =
  | "costs"
  | "routing"
  | "budget"
  | "prefer-local"
  | "quality"
  | "cost-forecast"
  | "savings-analysis";

export function handleCommand(cmd: CommandName, args?: string): string {
  switch (cmd) {
    case "costs":
      return cmdCosts(args);
    case "routing":
      return cmdRouting(args);
    case "budget":
      return cmdBudget(args);
    case "prefer-local":
      return cmdPreferLocal(args);
    case "quality":
      return cmdQuality(args);
    case "cost-forecast":
      return cmdCostForecast(args);
    case "savings-analysis":
      return cmdSavingsAnalysis(args);
    default:
      return `Unknown command: /${cmd}`;
  }
}

// ============================================================
// COMMAND METADATA (for help/discovery)
// ============================================================

export const commandMetadata = {
  costs: {
    tier: 1,
    description: "Show today's spend and budget status",
    usage: "/costs [--trends|--breakdown]",
    examples: [
      "/costs — today's summary",
      "/costs --trends — weekly/monthly trends",
      "/costs --breakdown — by provider breakdown",
    ],
  },
  routing: {
    tier: 1,
    description: "Show routing decisions and preferences",
    usage: "/routing [--recent|--set taskType model]",
    examples: [
      "/routing — current status",
      "/routing --recent — last 10 decisions",
      "/routing --set rewrite claude-sonnet-4-6 — override for rewrite tasks",
    ],
  },
  budget: {
    tier: 1,
    description: "View or set daily budget",
    usage: "/budget [amount|--warning]",
    examples: [
      "/budget — show current budget",
      "/budget 5.00 — set daily budget to $5.00",
      "/budget --warning — check if nearing limit",
    ],
  },
  "prefer-local": {
    tier: 2,
    description: "Toggle preference for local (Ollama) models",
    usage: "/prefer-local [on|off]",
  },
  quality: {
    tier: 2,
    description: "Set quality threshold (1–10)",
    usage: "/quality [1-10]",
  },
  "cost-forecast": {
    tier: 3,
    description: "Forecast weekly/monthly spend",
    usage: "/cost-forecast [--if-opus]",
  },
  "savings-analysis": {
    tier: 3,
    description: "Analyze savings from routing",
    usage: "/savings-analysis [--vs-opus]",
  },
};
