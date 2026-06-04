/**
 * Helm Status Line for Claude Desktop
 *
 * Displays real-time cost metrics in the editor status bar.
 * Tier 1: Shows cost, budget %, model
 * Tier 2: Click → expand panel with details
 * Tier 3: Inline charts and advanced analytics
 */

import { helmToday, helmRoutingStatus, helmBudgetWarning } from "../mcp/helm-server";

// ============================================================
// STATUS LINE COMPONENTS
// ============================================================

export interface StatusLineState {
  isVisible: boolean;
  realCost: number;
  impliedCost: number;
  budgetPercent: number;
  budgetLevel: "ok" | "warning" | "critical";
  currentModel: string;
  budgetRemaining: number;
}

/**
 * Generate status line text for display
 *
 * Example outputs:
 * - "💰 $2.34/$10 (23%) | sonnet | ✓"
 * - "💰 $8.50/$10 (85%) | sonnet | ⚠️"
 * - "💰 $10.50/$10 (105%) | ollama | 🚨"
 */
export function getStatusLineText(): string {
  const helm = helmToday();
  const routing = helmRoutingStatus();

  if ((helm as any).status === "no-data") {
    return "💰 No cost data yet";
  }

  const data = helm as any;
  const routingData = routing as any;

  const budgetIcon =
    data.budget.level === "critical"
      ? "🚨"
      : data.budget.level === "warning"
        ? "⚠️"
        : "✓";

  const modelShort = extractModelShortName(
    routingData.recentDecisions[0]?.model || "unknown"
  );

  return (
    `💰 ${data.spend.real.formatted}/$${data.budget.daily.usd.toFixed(0)} ` +
    `(${Math.round(data.budget.percentUsed)}%) | ${modelShort} | ${budgetIcon}`
  );
}

function extractModelShortName(model: string): string {
  if (model.includes("sonnet")) return "sonnet";
  if (model.includes("opus")) return "opus";
  if (model.includes("haiku")) return "haiku";
  if (model.includes("gemini")) return "gemini";
  if (model.includes("gpt")) return "gpt";
  if (model.includes("llama")) return "ollama";
  if (model.includes("mistral")) return "ollama";
  return model.split("-")[0];
}

/**
 * Get detailed hover text (shown on mouseover)
 */
export function getHoverText(): string {
  const helm = helmToday();

  if ((helm as any).status === "no-data") {
    return "No cost data. Run benchmark to generate.";
  }

  const data = helm as any;

  let text = `Budget: ${data.budget.remaining.formatted} remaining (${Math.round(100 - data.budget.percentUsed)}% left)\n`;
  text += `Spent: ${data.spend.real.formatted} real / ${data.spend.implied.formatted} implied\n`;

  // Add provider breakdown
  for (const provider of data.byProvider) {
    if (provider.real.usd > 0 || provider.implied.usd > 0) {
      text += `${provider.provider}: ${provider.real.formatted}/${provider.implied.formatted}\n`;
    }
  }

  text += `\nClick for details or /costs for trends`;

  return text;
}

/**
 * Get expandable detail panel (Tier 2)
 */
export function getDetailPanel(): string {
  const helm = helmToday();
  const routing = helmRoutingStatus();

  if ((helm as any).status === "no-data") {
    return "No cost data available yet.\n\nRun a benchmark: npm run bench:opus-sonnet";
  }

  const data = helm as any;
  const routingData = routing as any;

  let panel = "";

  // Header
  const budgetIcon =
    data.budget.level === "critical"
      ? "🚨"
      : data.budget.level === "warning"
        ? "⚠️"
        : "✓";

  panel += `${budgetIcon} Budget Status\n`;
  panel += `$${data.spend.real.formatted} / $${data.budget.daily.formatted}\n`;
  panel += `${Math.round(data.budget.percentUsed)}% used\n\n`;

  // Provider breakdown
  panel += `By Provider\n`;
  for (const provider of data.byProvider) {
    if (provider.real.usd > 0 || provider.implied.usd > 0) {
      panel += `• ${provider.provider}: ${provider.real.formatted}\n`;
    }
  }

  // Routing info
  panel += `\nCurrent Routing\n`;
  if (routingData.recentDecisions.length > 0) {
    const recent = routingData.recentDecisions[0];
    panel += `• Model: ${recent.model}\n`;
  }

  panel += `• Prefer local: ${routingData.preferences.preferLocal ? "ON" : "OFF"}\n`;

  // Quick actions
  panel += `\nQuick Actions\n`;
  panel += `[/costs] [/routing] [/budget] [/prefer-local]\n`;

  return panel;
}

// ============================================================
// BUDGET ALERT SYSTEM (Tier 2)
// ============================================================

export interface BudgetAlert {
  visible: boolean;
  level: "info" | "warning" | "critical";
  message: string;
  action?: string;
}

export function checkBudgetAlert(): BudgetAlert {
  const warning = helmBudgetWarning();
  const data = warning as any;

  if (!data.warning) {
    return {
      visible: false,
      level: "info",
      message: "",
    };
  }

  return {
    visible: true,
    level: data.level,
    message: data.message,
    action:
      data.level === "critical"
        ? "Switch to local models"
        : data.level === "warning"
          ? "Prefer cheaper models"
          : undefined,
  };
}

// ============================================================
// INLINE VISUALIZATION (Tier 3)
// ============================================================

/**
 * Generate ASCII budget bar for inline display
 *
 * Example:
 * Budget: [████████░░░░░░░░░░░░░░░░░░░░] 33% ($2.34/$10)
 */
export function getBudgetBar(width: number = 30): string {
  const helm = helmToday();

  if ((helm as any).status === "no-data") {
    return "Budget: [" + "░".repeat(width) + "] 0%";
  }

  const data = helm as any;
  const percent = Math.min(100, data.budget.percentUsed);
  const filled = Math.round((percent / 100) * width);

  const bar =
    "[" +
    "█".repeat(filled) +
    "░".repeat(width - filled) +
    "] " +
    Math.round(percent) +
    "% " +
    `($${data.spend.real.formatted}/$${data.budget.daily.formatted})`;

  return "Budget: " + bar;
}

/**
 * Generate daily cost sparkline (Tier 3)
 *
 * Example: ▁▂▂▃▄▅▅▆ $2.34 (last 8 hours)
 */
export function getCostSparkline(): string {
  // TODO: Implement with hourly data from costLog
  return "Cost sparkline (Tier 3)";
}

// ============================================================
// CONFIGURATION
// ============================================================

export interface StatusLineConfig {
  enabled: boolean;
  showIcon: boolean;
  showBudget: boolean;
  showModel: boolean;
  showBudgetPercent: boolean;
  updateIntervalMs: number;
  expandOnClick: boolean;
  alertOnBudgetWarning: boolean;
}

export const defaultConfig: StatusLineConfig = {
  enabled: true,
  showIcon: true,
  showBudget: true,
  showModel: true,
  showBudgetPercent: true,
  updateIntervalMs: 5000, // Update every 5 seconds
  expandOnClick: true,
  alertOnBudgetWarning: true,
};
