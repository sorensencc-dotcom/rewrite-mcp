/**
 * Hourly Feedback Loop Scheduler
 * Runs CodeBurn analysis and routing rule updates on a fixed schedule.
 *
 * Usage:
 *   const scheduler = new FeedbackLoopScheduler();
 *   scheduler.start();
 *   // Runs at top of every hour
 */
interface SchedulerConfig {
    enabled: boolean;
    cronExpression: string;
    timezone?: string;
    maxConcurrentRuns: number;
    runOnStartup: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
}
export declare class FeedbackLoopScheduler {
    private config;
    private task;
    private isRunning;
    private activeRuns;
    private totalRuns;
    private lastRunTime;
    private lastRunStatus;
    private lastRunError;
    constructor(config?: Partial<SchedulerConfig>);
    /**
     * Start the scheduler
     */
    start(): void;
    /**
     * Stop the scheduler
     */
    stop(): void;
    /**
     * Run a single feedback loop cycle
     */
    private runCycle;
    /**
     * Get scheduler status
     */
    getStatus(): {
        enabled: boolean;
        isRunning: boolean;
        totalRuns: number;
        activeRuns: number;
        lastRunTime: Date | null;
        lastRunStatus: "success" | "error" | null;
        lastRunError: string | null;
    };
    /**
     * Manual trigger for testing
     */
    runNow(): Promise<void>;
    /**
     * Logging helper
     */
    private log;
}
/**
 * Initialize and start global scheduler
 */
export declare function initializeScheduler(config?: Partial<SchedulerConfig>): FeedbackLoopScheduler;
/**
 * Get global scheduler instance
 */
export declare function getScheduler(): FeedbackLoopScheduler | null;
/**
 * Shutdown global scheduler
 */
export declare function shutdownScheduler(): void;
export {};
