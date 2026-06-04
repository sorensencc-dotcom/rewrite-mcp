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

function ensurePrefsDir() {
  const dir = path.dirname(PREFS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
  const dailyBudget = 10.0;

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

function helmBudgetWarning() {
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
  const serverCapabilities = {
    tools: Object.keys(tools).map((name) => tools[name]),
  };

  sendResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: serverCapabilities,
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

    if (!msg.method || !msg.id) {
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
