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
/**
 * Initialize feedback loop scheduler
 */
export declare function bootstrapFeedbackLoop(): void;
/**
 * Shutdown feedback loop scheduler
 */
export declare function shutdownFeedbackLoop(): void;
/**
 * Get feedback loop status
 */
export declare function getFeedbackLoopStatus(): {
    enabled: boolean;
    isRunning: boolean;
    totalRuns: number;
    activeRuns: number;
    lastRunTime: Date | null;
    lastRunStatus: "success" | "error" | null;
    lastRunError: string | null;
} | {
    status: string;
};
