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
declare const router: import("express-serve-static-core").Router;
export default router;
