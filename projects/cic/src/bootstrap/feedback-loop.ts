/**
 * Bootstrap: Feedback Loop Initialization
 *
 * Initializes and starts the CodeBurn feedback loop scheduler
 * when the CIC server starts.
 *
 * Usage (in main server file):
 *   import { bootstrapFeedbackLoop } from './bootstrap/feedback-loop';
 *   bootstrapFeedbackLoop();
 */

import { initializeScheduler, getScheduler } from "../token-economy/scheduler";

/**
 * Initialize feedback loop scheduler
 */
export function bootstrapFeedbackLoop(): void {
  console.log("[Bootstrap] Initializing CodeBurn feedback loop scheduler...");

  try {
    const scheduler = initializeScheduler({
      logLevel: process.env.FEEDBACK_LOOP_LOG_LEVEL as "debug" | "info" | "warn" | "error" | undefined
    });

    const status = scheduler.getStatus();
    console.log(`[Bootstrap] ✅ Feedback loop scheduler ready`);
    console.log(`  - Status: ${status.isRunning ? "RUNNING" : "STOPPED"}`);
    console.log(`  - Total cycles: ${status.totalRuns}`);

    if (!status.isRunning) {
      console.warn("[Bootstrap] ⚠️  Feedback loop is not running. Check configuration.");
    }
  } catch (err) {
    console.error(`[Bootstrap] ❌ Failed to initialize feedback loop: ${err}`);
    throw err;
  }
}

/**
 * Shutdown feedback loop scheduler
 */
export function shutdownFeedbackLoop(): void {
  console.log("[Bootstrap] Shutting down feedback loop scheduler...");

  const scheduler = getScheduler();
  if (scheduler) {
    scheduler.stop();
    console.log("[Bootstrap] ✅ Feedback loop scheduler stopped");
  }
}

/**
 * Get feedback loop status
 */
export function getFeedbackLoopStatus() {
  const scheduler = getScheduler();
  if (!scheduler) {
    return { status: "NOT_INITIALIZED" };
  }
  return scheduler.getStatus();
}
