import {
  CostAgentEvent,
  DEFAULT_CONSTRAINTS,
  TaskType,
} from "./policy";
import {
  generateDailyReport,
  generateWeeklyReport,
} from "../costs/reports/generate";
import { writeHelmDashboardReport } from "../costs/reports/helm";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

export interface CostAgentConfig {
  checkIntervalMs?: number; // default: 60s
  dailyBudgetUsd?: number; // default from DEFAULT_CONSTRAINTS
  hourlyBudgetUsd?: number; // default from DEFAULT_CONSTRAINTS
  shiftToLocalThreshold?: number; // 0–1, default 0.7
  onEvent?: (event: CostAgentEvent) => void;
}

interface AgentPreferences {
  preferLocal: boolean;
  preferCheaperModels: boolean;
  taskTypeOverrides: Record<TaskType, string>; // model to prefer for each task
}

const PREFS_PATH = join(
  process.cwd(),
  "benchmarks",
  "routing",
  ".agent-prefs.json"
);

function loadPreferences(): AgentPreferences {
  if (existsSync(PREFS_PATH)) {
    try {
      return JSON.parse(readFileSync(PREFS_PATH, "utf8"));
    } catch {
      // Fall through
    }
  }

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

function savePreferences(prefs: AgentPreferences): void {
  const dir = join(process.cwd(), "benchmarks", "routing");
  writeFileSync(
    PREFS_PATH,
    JSON.stringify(prefs, null, 2),
    "utf8"
  );
}

export function startCostAgent(config: CostAgentConfig): () => void {
  const checkIntervalMs = config.checkIntervalMs ?? 60_000; // 60s default
  const dailyBudget = config.dailyBudgetUsd ?? DEFAULT_CONSTRAINTS.dailyBudgetUsd;
  const hourlyBudget = config.hourlyBudgetUsd ?? DEFAULT_CONSTRAINTS.hourlyBudgetUsd;
  const localThreshold = config.shiftToLocalThreshold ?? DEFAULT_CONSTRAINTS.shiftToLocalThreshold;

  let isRunning = true;

  const checkLoop = async () => {
    while (isRunning) {
      try {
        await performCheck();
      } catch (err) {
        console.error("[CostAgent] Check failed:", err);
      }

      await new Promise((r) => setTimeout(r, checkIntervalMs));
    }
  };

  const performCheck = async () => {
    // Regenerate reports
    await generateDailyReport();
    await generateWeeklyReport();
    await writeHelmDashboardReport();

    // Read today's summary
    const helmPath = join(
      process.cwd(),
      "benchmarks",
      "costs",
      "reports",
      "helm.json"
    );

    if (!existsSync(helmPath)) {
      return; // No cost data yet
    }

    const helm = JSON.parse(readFileSync(helmPath, "utf8"));
    const spend = helm.today?.totalRealUsd ?? 0;

    // Check budgets and emit events
    if (spend > dailyBudget) {
      const prefs = loadPreferences();
      if (!prefs.preferLocal) {
        prefs.preferLocal = true;
        savePreferences(prefs);

        config.onEvent?.({
          type: "prefer-local",
          reason: `Daily spend $${spend.toFixed(2)} exceeds budget $${dailyBudget}; routing low-stakes tasks to Ollama.`,
        });
      }

      config.onEvent?.({
        type: "budget-warning",
        level: "daily",
        spendUsd: spend,
      });
    } else if (spend > dailyBudget * localThreshold) {
      const prefs = loadPreferences();
      if (!prefs.preferCheaperModels) {
        prefs.preferCheaperModels = true;
        savePreferences(prefs);

        config.onEvent?.({
          type: "switch-to-cheaper",
          reason: `Daily spend $${spend.toFixed(2)} above threshold ($${(dailyBudget * localThreshold).toFixed(2)}); prefer cheaper models.`,
        });
      }
    } else {
      // Below threshold; clear preferences
      const prefs = loadPreferences();
      if (prefs.preferLocal || prefs.preferCheaperModels) {
        prefs.preferLocal = false;
        prefs.preferCheaperModels = false;
        savePreferences(prefs);
      }
    }
  };

  // Start the loop in the background
  checkLoop(); // Don't await; let it run

  // Return a stop function
  return () => {
    isRunning = false;
  };
}

export function getAgentPreferences(): AgentPreferences {
  return loadPreferences();
}

export function setTaskTypeOverride(taskType: TaskType, model: string): void {
  const prefs = loadPreferences();
  prefs.taskTypeOverrides[taskType] = model;
  savePreferences(prefs);
}

export function clearTaskTypeOverride(taskType: TaskType): void {
  const prefs = loadPreferences();
  prefs.taskTypeOverrides[taskType] = "";
  savePreferences(prefs);
}
