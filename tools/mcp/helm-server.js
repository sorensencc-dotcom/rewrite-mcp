#!/usr/bin/env node

/**
 * Helm MCP Server — Phase 47/48 Cost Intelligence for Claude Desktop
 *
 * Pure JavaScript implementation (no TypeScript dependencies)
 * Exposes cost data, routing decisions, budget controls via MCP tools.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CORE READERS & PERSISTENCE
// ============================================================

const PREFS_PATH = path.join(process.cwd(), "benchmarks", "routing", "helm-prefs.json");
const BUDGET_PATH = path.join(process.cwd(), "benchmarks", "costs", "helm-budget.json");
const ALERTS_PATH = path.join(process.cwd(), "benchmarks", "costs", "helm-alerts.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensurePrefsDir() {
  ensureDir(path.dirname(PREFS_PATH));
}

function readPreferences() {
  ensurePrefsDir();
  if (!fs.existsSync(PREFS_PATH)) {
    return {
      preferLocal: false,
      preferCheaperModels: false,
      taskTypeOverrides: {
        rewrite: "",
        analysis: "",
        generation: "",
        chat: "",
      },
    };
  }
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, "utf8"));
  } catch {
    return {
      preferLocal: false,
      preferCheaperModels: false,
      taskTypeOverrides: {
        rewrite: "",
        analysis: "",
        generation: "",
        chat: "",
      },
    };
  }
}

function writePreferences(prefs) {
  ensurePrefsDir();
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), "utf8");
}

function readHelm() {
  const helmPath = path.join(
    process.cwd(),
    "benchmarks",
    "costs",
    "reports",
    "helm.json"
  );

  if (!fs.existsSync(helmPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(helmPath, "utf8"));
  } catch {
    return null;
  }
}

function readCostLog() {
  const logPath = path.join(process.cwd(), "benchmarks", "costs", "costLog.json");

  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    return [];
  }
}

function readBudgetConfig() {
  ensureDir(path.dirname(BUDGET_PATH));
  if (!fs.existsSync(BUDGET_PATH)) {
    return {
      dailyBudget: 10.0,
      alertThresholds: {
        warning: 80,
        critical: 95,
      },
      alertsEnabled: true,
      lastUpdated: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(fs.readFileSync(BUDGET_PATH, "utf8"));
  } catch {
    return {
      dailyBudget: 10.0,
      alertThresholds: { warning: 80, critical: 95 },
      alertsEnabled: true,
      lastUpdated: new Date().toISOString(),
    };
  }
}

function writeBudgetConfig(config) {
  ensureDir(path.dirname(BUDGET_PATH));
  config.lastUpdated = new Date().toISOString();
  fs.writeFileSync(BUDGET_PATH, JSON.stringify(config, null, 2), "utf8");
}

function readAlerts() {
  ensureDir(path.dirname(ALERTS_PATH));
  if (!fs.existsSync(ALERTS_PATH)) {
    return { alerts: [], lastAlert: null };
  }
  try {
    return JSON.parse(fs.readFileSync(ALERTS_PATH, "utf8"));
  } catch {
    return { alerts: [], lastAlert: null };
  }
}

function writeAlerts(alertsData) {
  ensureDir(path.dirname(ALERTS_PATH));
  fs.writeFileSync(ALERTS_PATH, JSON.stringify(alertsData, null, 2), "utf8");
}

// ============================================================
// TIER 1: MVP TOOLS
// ============================================================

function helmToday() {
  const helm = readHelm();

  if (!helm) {
    return {
      status: "no-data",
      message: "No cost data available yet. Run a benchmark to generate data.",
    };
  }

  const today = helm.today;
  const budgetConfig = readBudgetConfig();
  const dailyBudget = budgetConfig.dailyBudget;

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

function helmTrends() {
  const costLog = readCostLog();
  const modelCounts = costLog.reduce((acc, entry) => {
    const key = entry.model;
    if (!acc[key]) acc[key] = 0;
    acc[key]++;
    return acc;
  }, {});

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
      daily: new Date().toISOString().slice(0, 10),
      weekly: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      monthly: new Date().toISOString().slice(0, 7),
    },
    modelDistribution,
    totalCalls,
    savingsEstimate: {
      weekly: "$0.00",
      message: "Estimated savings vs always using Opus",
    },
  };
}

function helmRoutingStatus() {
  const prefs = readPreferences();
  const costLog = readCostLog();

  const routingLog = costLog.slice(-10).map((entry) => ({
    timestamp: entry.timestamp,
    model: entry.model,
    tokens: entry.inputTokens + entry.outputTokens,
    cost: entry.amountUsd ?? 0,
    taskType: entry.metadata?.taskType || "unknown",
  }));

  return {
    preferences: prefs,
    recentDecisions: routingLog,
    status: {
      agentActive: true,
      lastUpdate: new Date().toISOString(),
    },
  };
}

function helmSetRouting(input) {
  const prefs = readPreferences();

  if (input?.set) {
    // Parse "taskType:model" format (e.g., "rewrite:haiku")
    const [taskType, model] = input.set.split(":");
    if (taskType && model) {
      if (prefs.taskTypeOverrides && taskType in prefs.taskTypeOverrides) {
        prefs.taskTypeOverrides[taskType] = model;
        writePreferences(prefs);
        return {
          success: true,
          message: `Set ${taskType} to prefer ${model}`,
          taskType,
          preferredModel: model,
          preferences: prefs,
        };
      }
      return {
        success: false,
        error: `Unknown task type: ${taskType}. Must be one of: rewrite, analysis, generation, chat`,
      };
    }
    return {
      success: false,
      error: "Format must be 'taskType:model' (e.g., 'rewrite:haiku')",
    };
  }

  if (input?.clear && input.clear in prefs.taskTypeOverrides) {
    prefs.taskTypeOverrides[input.clear] = "";
    writePreferences(prefs);
    return {
      success: true,
      message: `Cleared override for ${input.clear}. Will use automatic routing.`,
      preferences: prefs,
    };
  }

  return {
    success: false,
    error: "Provide 'set' (format: taskType:model) or 'clear' (taskType) parameter",
  };
}

function helmSetBudget(input) {
  const config = readBudgetConfig();

  if (input?.daily) {
    const newBudget = parseFloat(input.daily);
    if (isNaN(newBudget) || newBudget <= 0) {
      return {
        success: false,
        error: "Daily budget must be a positive number",
      };
    }
    config.dailyBudget = newBudget;
  }

  if (input?.warningThreshold !== undefined) {
    const thresh = parseInt(input.warningThreshold);
    if (isNaN(thresh) || thresh < 1 || thresh > 99) {
      return {
        success: false,
        error: "Warning threshold must be 1-99",
      };
    }
    config.alertThresholds.warning = thresh;
  }

  if (input?.criticalThreshold !== undefined) {
    const thresh = parseInt(input.criticalThreshold);
    if (isNaN(thresh) || thresh < 1 || thresh > 100) {
      return {
        success: false,
        error: "Critical threshold must be 1-100",
      };
    }
    config.alertThresholds.critical = thresh;
  }

  writeBudgetConfig(config);

  return {
    success: true,
    message: "Budget configuration updated",
    config,
  };
}

function helmCostForecast() {
  const helm = readHelm();
  const costLog = readCostLog();
  const budgetConfig = readBudgetConfig();

  if (!helm || costLog.length === 0) {
    return {
      forecast: null,
      message: "Insufficient data for forecasting",
    };
  }

  const today = helm.today;
  const spent = today.totalRealUsd;
  const dailyBudget = budgetConfig.dailyBudget;

  // Calculate burn rate (cost per entry)
  const costPerCall = costLog.length > 0 ? spent / costLog.length : 0;
  const estimatedCallsPerDay = costLog.length; // Approximate

  const remaining = dailyBudget - spent;
  const estimatedCallsUntilBudget =
    remaining > 0 ? Math.floor(remaining / costPerCall) : 0;

  return {
    currentSpend: spent,
    budgetRemaining: remaining,
    dailyBudget,
    burnRate: {
      costPerCall: costPerCall.toFixed(4),
      callsProcessedToday: costLog.length,
    },
    forecast: {
      estimatedCallsUntilBudgetExhausted: estimatedCallsUntilBudget,
      estimatedTimeUntilExhausted:
        estimatedCallsUntilBudget > 0 ? "Unknown (depends on usage)" : "Already exceeded",
      recommendation:
        remaining < dailyBudget * 0.2
          ? "Switch to cheaper models to extend budget"
          : "Budget OK for typical usage",
    },
  };
}

function helmQualityMetrics() {
  const costLog = readCostLog();

  if (costLog.length === 0) {
    return { message: "No quality data available yet" };
  }

  // Group by model and calculate metrics
  const modelMetrics = costLog.reduce((acc, entry) => {
    const model = entry.model;
    if (!acc[model]) {
      acc[model] = {
        calls: 0,
        totalCost: 0,
        totalTokens: 0,
        taskTypes: {},
      };
    }
    acc[model].calls++;
    acc[model].totalCost += entry.amountUsd ?? 0;
    acc[model].totalTokens +=
      (entry.inputTokens || 0) + (entry.outputTokens || 0);

    const taskType = entry.metadata?.taskType || "unknown";
    if (!acc[model].taskTypes[taskType]) {
      acc[model].taskTypes[taskType] = 0;
    }
    acc[model].taskTypes[taskType]++;

    return acc;
  }, {});

  // Calculate cost-effectiveness
  const quality = Object.entries(modelMetrics)
    .map(([model, metrics]) => ({
      model,
      calls: metrics.calls,
      totalCost: metrics.totalCost.toFixed(4),
      avgCostPerCall: (metrics.totalCost / metrics.calls).toFixed(6),
      costPerMToken: ((metrics.totalCost / (metrics.totalTokens / 1000000)) || 0).toFixed(4),
      taskDistribution: metrics.taskTypes,
    }))
    .sort((a, b) => parseFloat(b.avgCostPerCall) - parseFloat(a.avgCostPerCall));

  return {
    summary: `${quality.length} models analyzed, ${costLog.length} total calls`,
    models: quality,
  };
}

function helmBudgetWarning() {
  const helm = readHelm();
  const budgetConfig = readBudgetConfig();

  if (!helm) {
    return {
      warning: false,
      message: "No cost data yet.",
      config: budgetConfig,
    };
  }

  const dailyBudget = budgetConfig.dailyBudget;
  const spent = helm.today.totalRealUsd;
  const remaining = dailyBudget - spent;
  const percentUsed = (spent / dailyBudget) * 100;

  // Record alert if triggered
  if (percentUsed >= budgetConfig.alertThresholds.critical || remaining < 0) {
    const alertsData = readAlerts();
    alertsData.alerts.push({
      timestamp: new Date().toISOString(),
      level: remaining < 0 ? "critical" : "critical",
      spent,
      remaining,
      percentUsed,
    });
    alertsData.lastAlert = new Date().toISOString();
    writeAlerts(alertsData);
  }

  if (remaining < 0) {
    return {
      warning: true,
      level: "critical",
      message: `⚠️ OVER BUDGET: Spent $${spent.toFixed(2)} of $${dailyBudget.toFixed(2)}. Remaining: -$${Math.abs(remaining).toFixed(2)}`,
      spent,
      remaining,
      percentUsed,
      budgetConfig,
    };
  }

  if (percentUsed >= budgetConfig.alertThresholds.warning) {
    return {
      warning: true,
      level: "warning",
      message: `⚠️ Budget warning: $${remaining.toFixed(2)} remaining (${Math.round(100 - percentUsed)}% left). Threshold: ${budgetConfig.alertThresholds.warning}%`,
      spent,
      remaining,
      percentUsed,
      budgetConfig,
    };
  }

  return {
    warning: false,
    message: `Budget OK: $${remaining.toFixed(2)} remaining (${Math.round(100 - percentUsed)}% left)`,
    spent,
    remaining,
    percentUsed,
    budgetConfig,
  };
}

function helmAlerts(input) {
  const alertsData = readAlerts();

  if (input?.clear) {
    alertsData.alerts = [];
    alertsData.lastAlert = null;
    writeAlerts(alertsData);
    return {
      success: true,
      message: "All alerts cleared",
      alertsData,
    };
  }

  if (input?.last) {
    return {
      success: true,
      lastAlert: alertsData.lastAlert,
      alertCount: alertsData.alerts.length,
    };
  }

  return {
    success: true,
    alerts: alertsData.alerts,
    summary: {
      total: alertsData.alerts.length,
      critical: alertsData.alerts.filter((a) => a.level === "critical").length,
      warning: alertsData.alerts.filter((a) => a.level === "warning").length,
      lastAlert: alertsData.lastAlert,
    },
  };
}

// ============================================================
// TOOL DEFINITIONS FOR MCP
// ============================================================

const tools = {
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
  "costs": {
    name: "costs",
    description:
      "Display today's API costs, budget status, and spending breakdown by provider. Alias for helm:today.",
    inputSchema: {
      type: "object",
      properties: {
        breakdown: {
          type: "boolean",
          description: "Show detailed breakdown by model and provider",
        },
        trends: {
          type: "boolean",
          description: "Show weekly/monthly trends",
        },
      },
      required: [],
    },
  },
  "routing": {
    name: "routing",
    description:
      "Show current model routing preferences and recent routing decisions. Alias for helm:routing-status.",
    inputSchema: {
      type: "object",
      properties: {
        set: {
          type: "string",
          description: "Set routing preference (e.g., 'taskType=rewrite:haiku')",
        },
      },
      required: [],
    },
  },
  "budget": {
    name: "budget",
    description:
      "Check daily budget status and remaining spend. Alias for helm:budget-warning.",
    inputSchema: {
      type: "object",
      properties: {
        warning: {
          type: "boolean",
          description: "Show only if there's a budget warning",
        },
      },
      required: [],
    },
  },
  "helm:set-preference": {
    name: "helm:set-preference",
    description:
      "Set routing preferences for model selection by task type. Tier 2 feature.",
    inputSchema: {
      type: "object",
      properties: {
        set: {
          type: "string",
          description: "Set override (e.g., 'rewrite:haiku' to use Haiku for rewrite tasks)",
        },
        clear: {
          type: "string",
          description: "Clear override for a task type (e.g., 'rewrite')",
        },
      },
      required: [],
    },
  },
  "helm:set-budget": {
    name: "helm:set-budget",
    description:
      "Configure daily budget and alert thresholds. Tier 2 feature.",
    inputSchema: {
      type: "object",
      properties: {
        daily: {
          type: "number",
          description: "Daily budget amount in USD (e.g., 25.0)",
        },
        warningThreshold: {
          type: "integer",
          description: "Percentage to trigger warning (1-99, default 80)",
        },
        criticalThreshold: {
          type: "integer",
          description: "Percentage to trigger critical alert (1-100, default 95)",
        },
      },
      required: [],
    },
  },
  "helm:cost-forecast": {
    name: "helm:cost-forecast",
    description:
      "Calculate cost burn rate and forecast budget exhaustion. Tier 2 feature.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "helm:quality-metrics": {
    name: "helm:quality-metrics",
    description:
      "Analyze model cost-effectiveness and quality metrics. Tier 2 feature.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "helm:alerts": {
    name: "helm:alerts",
    description:
      "View and manage budget alerts. List all alerts, view last alert, or clear all alerts.",
    inputSchema: {
      type: "object",
      properties: {
        last: {
          type: "boolean",
          description: "Show only the last alert and count",
        },
        clear: {
          type: "boolean",
          description: "Clear all alerts",
        },
      },
      required: [],
    },
  },
};

// ============================================================
// MCP JSON-RPC PROTOCOL
// ============================================================

let messageId = 0;

function sendMessage(method, params, id = null) {
  const msg = {
    jsonrpc: "2.0",
    method,
    params,
  };
  if (id !== null) msg.id = id;
  console.log(JSON.stringify(msg));
}

function sendResponse(id, result) {
  console.log(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      result,
    })
  );
}

function sendError(id, code, message) {
  console.log(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
      },
    })
  );
}

// ============================================================
// MCP MESSAGE HANDLERS
// ============================================================

function handleInitialize(params, id) {
  sendResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "helm-cost-intelligence",
      version: "1.0.0",
    },
  });
}

function handleToolCall(toolName, input, id) {
  try {
    let result;
    switch (toolName) {
      case "helm:today":
      case "costs":
        result = helmToday();
        break;
      case "helm:trends":
        result = helmTrends();
        break;
      case "helm:routing-status":
      case "routing":
        if (input?.set || input?.clear) {
          result = helmSetRouting(input);
        } else {
          result = helmRoutingStatus();
        }
        break;
      case "helm:budget-warning":
      case "budget":
        result = helmBudgetWarning();
        break;
      case "helm:set-preference":
        result = helmSetRouting(input);
        break;
      case "helm:set-budget":
        result = helmSetBudget(input);
        break;
      case "helm:cost-forecast":
        result = helmCostForecast();
        break;
      case "helm:quality-metrics":
        result = helmQualityMetrics();
        break;
      case "helm:alerts":
        result = helmAlerts(input);
        break;
      default:
        sendError(id, -32601, `Unknown tool: ${toolName}`);
        return;
    }

    sendResponse(id, {
      type: "text",
      text: JSON.stringify(result, null, 2),
    });
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

// ============================================================
// MCP SERVER LOOP
// ============================================================

console.error("[Helm] MCP Server starting...");
console.error("[Helm] Available tools:", Object.keys(tools));
console.error("[Helm] Ready to accept tool calls");

const rl = readline.createInterface({
  input: process.stdin,
  output: null, // Don't write to stdout automatically
  terminal: false,
});

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);

    if (!msg.method || msg.id === undefined || msg.id === null) {
      console.error("[Helm] Invalid message: missing method or id");
      return;
    }

    if (msg.method === "initialize") {
      handleInitialize(msg.params || {}, msg.id);
    } else if (msg.method === "tools/list") {
      sendResponse(msg.id, {
        tools: Object.values(tools),
      });
    } else if (msg.method === "tools/call") {
      const { name, arguments: args } = msg.params || {};
      handleToolCall(name, args || {}, msg.id);
    } else if (msg.method === "resources/list") {
      sendResponse(msg.id, { resources: [] });
    } else if (msg.method === "prompts/list") {
      sendResponse(msg.id, { prompts: [] });
    } else {
      sendError(msg.id, -32601, `Unknown method: ${msg.method}`);
    }
  } catch (err) {
    console.error(`[Helm] Error processing message: ${err.message}`);
  }
});

rl.on("close", () => {
  console.error("[Helm] Server closed");
  process.exit(0);
});
