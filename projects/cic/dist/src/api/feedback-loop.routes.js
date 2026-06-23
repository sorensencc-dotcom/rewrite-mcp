/**
 * API Routes: Feedback Loop Scheduler
 *
 * Exposes scheduler status and control endpoints.
 *
 * Routes:
 *   GET  /api/feedback-loop/status      — Get scheduler status
 *   POST /api/feedback-loop/run-now     — Manually trigger a cycle
 *   POST /api/feedback-loop/start       — Start scheduler
 *   POST /api/feedback-loop/stop        — Stop scheduler
 *
 * Usage (in main server file):
 *   import feedbackLoopRoutes from './api/feedback-loop.routes';
 *   app.use(feedbackLoopRoutes);
 */
import { Router } from "express";
import { getScheduler } from "../token-economy/scheduler";
const router = Router();
/**
 * GET /api/feedback-loop/status
 * Get current scheduler status
 */
router.get("/api/feedback-loop/status", (req, res) => {
    const scheduler = getScheduler();
    if (!scheduler) {
        return res.status(503).json({
            error: "Scheduler not initialized",
            status: "NOT_INITIALIZED"
        });
    }
    const status = scheduler.getStatus();
    res.json(status);
});
/**
 * POST /api/feedback-loop/run-now
 * Manually trigger a feedback loop cycle
 */
router.post("/api/feedback-loop/run-now", async (req, res) => {
    const scheduler = getScheduler();
    if (!scheduler) {
        return res.status(503).json({
            error: "Scheduler not initialized"
        });
    }
    try {
        await scheduler.runNow();
        const status = scheduler.getStatus();
        res.json({
            message: "Feedback loop cycle triggered",
            status
        });
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: "Failed to run feedback loop",
            details: error
        });
    }
});
/**
 * POST /api/feedback-loop/start
 * Start the scheduler
 */
router.post("/api/feedback-loop/start", (req, res) => {
    const scheduler = getScheduler();
    if (!scheduler) {
        return res.status(503).json({
            error: "Scheduler not initialized"
        });
    }
    try {
        scheduler.start();
        const status = scheduler.getStatus();
        res.json({
            message: "Scheduler started",
            status
        });
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: "Failed to start scheduler",
            details: error
        });
    }
});
/**
 * POST /api/feedback-loop/stop
 * Stop the scheduler
 */
router.post("/api/feedback-loop/stop", (req, res) => {
    const scheduler = getScheduler();
    if (!scheduler) {
        return res.status(503).json({
            error: "Scheduler not initialized"
        });
    }
    try {
        scheduler.stop();
        const status = scheduler.getStatus();
        res.json({
            message: "Scheduler stopped",
            status
        });
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            error: "Failed to stop scheduler",
            details: error
        });
    }
});
export default router;
//# sourceMappingURL=feedback-loop.routes.js.map