/**
 * Hourly Feedback Loop Scheduler
 * Runs CodeBurn analysis and routing rule updates on a fixed schedule.
 *
 * Usage:
 *   const scheduler = new FeedbackLoopScheduler();
 *   scheduler.start();
 *   // Runs at top of every hour
 */
import cron from "node-cron";
import { applyCodeburnInsights, exportTelemetryForCodeburn } from "./feedback_loop";
const DEFAULT_CONFIG = {
    enabled: true,
    cronExpression: "0 * * * *", // Top of every hour
    timezone: "UTC",
    maxConcurrentRuns: 1,
    runOnStartup: false,
    logLevel: "info"
};
export class FeedbackLoopScheduler {
    constructor(config = {}) {
        this.task = null;
        this.isRunning = false;
        this.activeRuns = 0;
        this.totalRuns = 0;
        this.lastRunTime = null;
        this.lastRunStatus = null;
        this.lastRunError = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Start the scheduler
     */
    start() {
        if (this.isRunning) {
            this.log("warn", "Scheduler already running");
            return;
        }
        if (!this.config.enabled) {
            this.log("info", "Scheduler is disabled");
            return;
        }
        this.task = cron.schedule(this.config.cronExpression, () => this.runCycle(), {
            timezone: this.config.timezone
        });
        this.isRunning = true;
        this.log("info", `Scheduler started: ${this.config.cronExpression}`);
        if (this.config.runOnStartup) {
            this.log("info", "Running initial cycle on startup");
            this.runCycle();
        }
    }
    /**
     * Stop the scheduler
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        this.isRunning = false;
        this.log("info", "Scheduler stopped");
    }
    /**
     * Run a single feedback loop cycle
     */
    async runCycle() {
        if (this.activeRuns >= this.config.maxConcurrentRuns) {
            this.log("warn", `Max concurrent runs (${this.config.maxConcurrentRuns}) reached, skipping cycle`);
            return;
        }
        this.activeRuns++;
        this.totalRuns++;
        const cycleStartTime = Date.now();
        try {
            this.log("info", `[Cycle ${this.totalRuns}] Starting feedback loop...`);
            // Step 1: Export telemetry
            this.log("debug", "[Cycle] Exporting telemetry for CodeBurn");
            exportTelemetryForCodeburn();
            // Step 2: Apply CodeBurn insights
            this.log("debug", "[Cycle] Applying CodeBurn insights");
            applyCodeburnInsights();
            const cycleTime = Date.now() - cycleStartTime;
            this.lastRunTime = new Date();
            this.lastRunStatus = "success";
            this.lastRunError = null;
            this.log("info", `[Cycle ${this.totalRuns}] ✅ Complete (${cycleTime}ms)`);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.lastRunStatus = "error";
            this.lastRunError = error;
            this.log("error", `[Cycle ${this.totalRuns}] ❌ Failed: ${error.message}`);
        }
        finally {
            this.activeRuns--;
        }
    }
    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            isRunning: this.isRunning,
            totalRuns: this.totalRuns,
            activeRuns: this.activeRuns,
            lastRunTime: this.lastRunTime,
            lastRunStatus: this.lastRunStatus,
            lastRunError: this.lastRunError?.message || null
        };
    }
    /**
     * Manual trigger for testing
     */
    async runNow() {
        this.log("info", "Manual trigger: running feedback loop now");
        await this.runCycle();
    }
    /**
     * Logging helper
     */
    log(level, message) {
        const timestamp = new Date().toISOString();
        const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = logLevels[this.config.logLevel] || 1;
        const messageLevel = logLevels[level] || 1;
        if (messageLevel >= currentLevel) {
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
}
/**
 * Global scheduler instance
 */
let globalScheduler = null;
/**
 * Initialize and start global scheduler
 */
export function initializeScheduler(config) {
    if (globalScheduler) {
        return globalScheduler;
    }
    const configFromEnv = {
        enabled: process.env.FEEDBACK_LOOP_ENABLED !== "false",
        cronExpression: process.env.FEEDBACK_LOOP_CRON || "0 * * * *",
        logLevel: (process.env.FEEDBACK_LOOP_LOG_LEVEL || "info"),
        runOnStartup: process.env.FEEDBACK_LOOP_RUN_ON_STARTUP === "true"
    };
    globalScheduler = new FeedbackLoopScheduler({ ...configFromEnv, ...config });
    globalScheduler.start();
    return globalScheduler;
}
/**
 * Get global scheduler instance
 */
export function getScheduler() {
    return globalScheduler;
}
/**
 * Shutdown global scheduler
 */
export function shutdownScheduler() {
    if (globalScheduler) {
        globalScheduler.stop();
        globalScheduler = null;
    }
}
//# sourceMappingURL=scheduler.js.map