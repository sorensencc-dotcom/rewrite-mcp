/**
 * Minimal Bootstrap: Start only the ABB-CODEBURN-INTEGRATION Feedback Loop Scheduler
 * Bypasses the full ContextServer stack (which has import issues)
 *
 * Usage: node dist/bootstrap/start-scheduler-only.js
 */

import { initializeScheduler, getScheduler } from "../token-economy/scheduler.js";
import * as fs from "node:fs";
import * as path from "node:path";

async function startSchedulerOnly() {
  console.log("[ABB-CODEBURN] Initializing Feedback Loop Scheduler...");

  try {
    // Initialize the scheduler with environment config
    const scheduler = initializeScheduler({
      enabled: process.env.FEEDBACK_LOOP_ENABLED !== "false",
      cronExpression: process.env.FEEDBACK_LOOP_CRON || "0 * * * *", // Every hour
      logLevel: (process.env.FEEDBACK_LOOP_LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
      runOnStartup: process.env.FEEDBACK_LOOP_RUN_ON_STARTUP === "true",
    });

    console.log("[ABB-CODEBURN] ✅ Scheduler initialized");
    console.log(`[ABB-CODEBURN] Status:`, scheduler.getStatus());

    // Create telemetry directories if they don't exist
    const telemetryDirs = [
      path.join(process.env.HOME || ".", ".cic", "logs", "telemetry"),
      path.join(process.env.HOME || ".", ".rewrite-labs", "logs", "telemetry"),
    ];

    for (const dir of telemetryDirs) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[ABB-CODEBURN] Telemetry directory ready: ${dir}`);
    }

    // Start scheduler
    scheduler.start();
    console.log("[ABB-CODEBURN] ✅ Scheduler RUNNING");
    console.log(`[ABB-CODEBURN] Next run: ${new Date(Date.now() + 60000).toISOString()}`);

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("[ABB-CODEBURN] SIGTERM received, shutting down...");
      scheduler.stop();
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("[ABB-CODEBURN] SIGINT received, shutting down...");
      scheduler.stop();
      process.exit(0);
    });

    console.log("[ABB-CODEBURN] Scheduler running. Press Ctrl+C to stop.");
    console.log("[ABB-CODEBURN] Telemetry logs: ~/.cic/logs/telemetry/");
    console.log("[ABB-CODEBURN] Recommendations: ./config/token-economy/routing_recommendations.json");

  } catch (error) {
    console.error("[ABB-CODEBURN] Failed to start scheduler:", error);
    process.exit(1);
  }
}

startSchedulerOnly();
