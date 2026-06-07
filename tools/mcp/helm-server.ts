/**
 * Helm MCP Server — Phase 47/48 Cost Intelligence for Claude Desktop
 *
 * Exposes cost data, routing decisions, budget controls via MCP tools.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getAgentPreferences,
  setTaskTypeOverride,
  clearTaskTypeOverride,
} from "../../benchmarks/routing/agent";

interface HelmDashboard {
  today: {
    totalRealUsd: number;
    totalImpliedUsd: number;
    byProvider: Record<string, { realUsd: number; impliedUsd: number }>;
  };
  generatedAt: string;
}

interface DailyReport {
  date: string;
  totalRealUsd: number;
  totalImpliedUsd: number;
  byProvider: Record<string, { realUsd: number; impliedUsd: number }>;
  dev: { realUsd: number; impliedUsd: number };
  prod: { realUsd: number; impliedUsd: number };
}

// ============================================================
// CORE READERS
// ============================================================

function readHelm(): HelmDashboard | null {
  const helmPath = join(
    process.cwd(),
    "benchmarks",
    "costs",
    "reports",
    "helm.json"
  );

  if (!existsSync(helmPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(helmPath, "utf8"));
  } catch {
    return null;
  }
}

function readDailyReport(date: string): DailyReport | null {
  const reportPath = join(
    process.cwd(),
    "benchmarks",
    "costs",
    "reports",
    "daily",
    `${date}.json`
  );

  if (!existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(reportPath, "utf8"));
  } catch {
    return null;
  }
}

function readWeeklyReport(date: string): DailyReport | null {
  const reportPath = join(
    process.cwd(),
    "benchmarks",
    "costs",
    "reports",
    "weekly",
    `${date}.json`
  );

  if (!existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(reportPath, "utf8"));
  } catch {
    return null;
  }
}

function readCostLog(): any[] {
  const logPath = join(process.cwd(), "benchmarks", "costs", "costLog.json");

  if (!existsSync(logPath)) {
    return [];
  }

  try {
    return JSON.parse(readFileSync(logPath, "utf8"));
  } catch {
    return [];
  }
}

// ============================================================
// TIER 1: MVP TOOLS
// ============================================================

/**
 * helm:today — Get today's spend, budget status, costs by provider
 */
export function helmToday(): object {
  const helm = readHelm();

  if (!helm) {
    return {
      status: "no-data",
      message: "No cost data available yet. Run a benchmark to generate data.",
    };
  }

  const today = helm.today;
  const dailyBudget = 10.0; // Default; can be configurable

  const budgetRemaining = dailyBudget - today.totalRealUsd;
  const budgetPercent = Math.max(0, (budgetRemaining / dailyBudget) * 100);
  const budgetLevel =
    budgetRemaining < 0
      ? "over-budget"
      : budgetPercent < 20
        ? "critical"
        : budgetPercent < 50
          ? "warning"
          : "ok";

  return {
    timestamp: helm.generatedAt,
    spend: {
      real: {
        usd: today.totalRealUsd,
        formatted: `$${today.totalRealUsd.toFixed(2)}`,
      },
      implied: {
        usd: today.totalImpliedUsd,
        formatted: `$${today.totalImpliedUsd.toFixed(2)}`,
      },
    },
    budget: {
      daily: { usd: dailyBudget, formatted: `$${dailyBudget.toFixed(2)}` },
      remaining: {
        usd: budgetRemaining,
        formatted: `$${Math.max(0, budgetRemaining).toFixed(2)}`,
      },
      percentUsed: Math.min(100, (today.totalRealUsd / dailyBudget) * 100),
      percentRemaining: Math.max(0, budgetPercent),
      level: budgetLevel,
    },
    byProvider: Object.entries(today.byProvider).map(([provider, costs]) => ({
      provider,
      real: {
        usd: costs.realUsd,
        formatted: `$${costs.realUsd.toFixed(2)}`,
      },
      implied: {
        usd: costs.impliedUsd,
        formatted: `$${costs.impliedUsd.toFixed(2)}`,
      },
    })),
  };
}

/**
 * helm:trends — Get weekly/monthly cost trends
 */
export function helmTrends(): object {
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const dailyReport = readDailyReport(today);
  const weeklyReport = readWeeklyReport(today);

  const costLog = readCostLog();
  const modelCounts = costLog.reduce(
    (acc, entry) => {
      const key = entry.model;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalCalls = costLog.length;
  const modelDistribution = Object.entries(modelCounts)
    .map(([model, count]) => ({
      model,
      calls: count,
      percent: Math.round((count / totalCalls) * 100),
    }))
    .sort((a, b) => b.calls - a.calls);

  return {
    period: {
      daily: today,
      weekly: thisWeek,
      monthly: thisMonth,
    },
    daily: dailyReport || { status: "no-data" },
    weekly: weeklyReport || { status: "no-data" },
    modelDistribution,
    totalCalls,
    savingsEstimate: {
      weekly: calculateSavings(weeklyReport),
      message: "Estimated savings vs always using Opus",
    },
  };
}

function calculateSavings(report: DailyReport | null): string {
  if (!report) return "$0.00";

  const costLog = readCostLog();
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = costLog.filter((e) => e.timestamp.startsWith(today));

  let opusCost = 0;
  let actualCost = 0;

  for (const entry of todayEntries) {
    // Estimate what Opus would cost
    const opusInput = (entry.inputTokens / 1_000_000) * 15;
    const opusOutput = (entry.outputTokens / 1_000_000) * 60;
    opusCost += opusInput + opusOutput;

    // Add actual cost
    actualCost += entry.amountUsd ?? 0;
  }

  const savings = opusCost - actualCost;
  return `$${Math.max(0, savings).toFixed(2)}`;
}

// ============================================================
// TIER 2: ROUTING & PREFERENCES
// ============================================================

/**
 * helm:routing-status — Get current routing preferences and model distribution
 */
export function helmRoutingStatus(): object {
  const prefs = getAgentPreferences();
  const costLog = readCostLog();

  const routingLog = costLog.slice(-10).map((entry) => ({
    timestamp: entry.timestamp,
    model: entry.model,
    tokens: entry.inputTokens + entry.outputTokens,
    cost: entry.amountUsd ?? 0,
    taskType: entry.metadata?.taskType || "unknown",
  }));

  return {
    preferences: {
      preferLocal: prefs.preferLocal,
      preferCheaperModels: prefs.preferCheaperModels,
      taskTypeOverrides: prefs.taskTypeOverrides,
    },
    recentDecisions: routingLog,
    status: {
      agentActive: true,
      lastUpdate: new Date().toISOString(),
    },
  };
}

/**
 * helm:set-preference — Override routing for a task type
 */
export function helmSetPreference(params: {
  taskType: "rewrite" | "analysis" | "generation" | "chat";
  model: string;
}): object {
  try {
    if (!params.model) {
      // Clear override
      clearTaskTypeOverride(params.taskType);
      return {
        success: true,
        message: `Cleared override for ${params.taskType}. Will use automatic routing.`,
      };
    }

    setTaskTypeOverride(params.taskType, params.model);
    return {
      success: true,
      message: `Set ${params.taskType} to prefer ${params.model}`,
      taskType: params.taskType,
      preferredModel: params.model,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * helm:budget-warning — Check if near budget limit
 */
export function helmBudgetWarning(): object {
  const helm = readHelm();

  if (!helm) {
    return { warning: false, message: "No cost data yet." };
  }

  const dailyBudget = 10.0;
  const spent = helm.today.totalRealUsd;
  const remaining = dailyBudget - spent;
  const percentUsed = (spent / dailyBudget) * 100;

  if (remaining < 0) {
    return {
      warning: true,
      level: "critical",
      message: `⚠️ OVER BUDGET: Spent $${spent.toFixed(2)} of $${dailyBudget.toFixed(2)}. Remaining: -$${Math.abs(remaining).toFixed(2)}`,
      spent,
      remaining,
      percentUsed,
    };
  }

  if (percentUsed >= 80) {
    return {
      warning: true,
      level: "warning",
      message: `⚠️ Budget low: $${remaining.toFixed(2)} remaining (${Math.round(100 - percentUsed)}% left). Consider switching to cheaper models.`,
      spent,
      remaining,
      percentUsed,
    };
  }

  return {
    warning: false,
    message: `Budget OK: $${remaining.toFixed(2)} remaining (${Math.round(100 - percentUsed)}% left)`,
    spent,
    remaining,
    percentUsed,
  };
}

// ============================================================
// TOOL DEFINITIONS FOR MCP
// ============================================================

export const tools = {
  "helm:today": {
    name: "helm:today",
    description:
      "Get today's spend, budget status, and costs broken down by provider. Shows real and implied costs.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "helm:trends": {
    name: "helm:trends",
    description:
      "Get weekly and monthly cost trends, model distribution, and estimated savings.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "helm:routing-status": {
    name: "helm:routing-status",
    description:
      "Get current routing preferences and recent routing decisions made by Phase 47.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "helm:set-preference": {
    name: "helm:set-preference",
    description:
      "Override routing preference for a specific task type (rewrite, analysis, generation, chat). Pass empty model to clear override.",
    inputSchema: {
      type: "object",
      properties: {
        taskType: {
          type: "string",
          enum: ["rewrite", "analysis", "generation", "chat"],
          description: "Task type to override",
        },
        model: {
          type: "string",
          description:
            "Model to prefer (e.g., claude-sonnet-4-6, claude-haiku-4-5). Leave empty to clear override.",
        },
      },
      required: ["taskType"],
    },
  },
  "helm:budget-warning": {
    name: "helm:budget-warning",
    description:
      "Check if current spending is approaching or exceeding daily budget. Returns warning level and recommendation.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ============================================================
// HANDLER DISPATCH
// ============================================================

export function handleToolCall(
  toolName: string,
  input: Record<string, any>
): string {
  try {
    switch (toolName) {
      case "helm:today":
        return JSON.stringify(helmToday(), null, 2);
      case "helm:trends":
        return JSON.stringify(helmTrends(), null, 2);
      case "helm:routing-status":
        return JSON.stringify(helmRoutingStatus(), null, 2);
      case "helm:set-preference":
        return JSON.stringify(
          helmSetPreference({
            taskType: input.taskType,
            model: input.model || "",
          }),
          null,
          2
        );
      case "helm:budget-warning":
        return JSON.stringify(helmBudgetWarning(), null, 2);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: (err as Error).message,
      tool: toolName,
    });
  }
}
