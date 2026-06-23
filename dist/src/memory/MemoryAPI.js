"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryQueryRouter = createMemoryQueryRouter;
const express_1 = require("express");
/**
 * MemoryAPI: Query endpoints for APR, CRO, ARPS, and operators.
 *
 * Contract:
 * - Read-only access to memory events
 * - Query by type, agent, session, timestamp
 * - Retrieve summaries and trends
 * - <100ms latency on queries
 */
function createMemoryQueryRouter(store, synthesizer) {
    const router = (0, express_1.Router)();
    /**
     * GET /memory/events
     * Query raw events with filters
     *
     * Query params:
     * - event_type: ARPS_DELTA | PIPELINE_RUN | ...
     * - source_agent: string
     * - session_id: string
     * - correlation_id: string
     * - limit: number (default: 100, max: 1000)
     * - offset: number (default: 0)
     * - after_timestamp: ISO8601
     * - before_timestamp: ISO8601
     */
    router.get('/events', async (req, res) => {
        try {
            const options = {
                event_type: req.query.event_type,
                source_agent: req.query.source_agent,
                session_id: req.query.session_id,
                correlation_id: req.query.correlation_id,
                limit: Math.min(parseInt(req.query.limit) || 100, 1000),
                offset: parseInt(req.query.offset) || 0,
                after_timestamp: req.query.after_timestamp,
                before_timestamp: req.query.before_timestamp,
            };
            const events = await store.query(options);
            res.json({
                success: true,
                total: events.length,
                limit: options.limit,
                offset: options.offset,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/events/:event_id
     * Get a single event by ID
     */
    router.get('/events/:event_id', async (req, res) => {
        try {
            const events = await store.query({ limit: 10000 });
            const event = events.find(e => e.id === req.params.event_id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    error: 'Event not found',
                });
            }
            res.json({
                success: true,
                event,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/recent
     * Get events from last N days
     *
     * Query params:
     * - days: number (default: 7)
     */
    router.get('/recent', async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const events = await store.getRecent(days);
            res.json({
                success: true,
                days,
                total: events.length,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/summaries
     * Get weekly and monthly summaries
     *
     * Query params:
     * - period: weekly | monthly | all (default: all)
     * - limit: number (default: 10)
     */
    router.get('/summaries', async (req, res) => {
        try {
            const period = req.query.period || 'all';
            const limit = parseInt(req.query.limit) || 10;
            let summaries = await synthesizer.getAllSummaries();
            if (period === 'weekly') {
                summaries = summaries.filter(s => s.period === 'weekly');
            }
            else if (period === 'monthly') {
                summaries = summaries.filter(s => s.period === 'monthly');
            }
            summaries = summaries.slice(-limit);
            res.json({
                success: true,
                period,
                total: summaries.length,
                summaries,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/trends
     * Get trend lines and analysis
     *
     * Returns 7-day and 30-day trend analysis
     */
    router.get('/trends', async (req, res) => {
        try {
            const recentWeekly = await synthesizer.getRecentWeeklySummaries(1);
            const recentMonthly = await synthesizer.getRecentMonthlySummaries(1);
            const weeklyTrends = recentWeekly[0]?.trend_lines || [];
            const monthlyTrends = recentMonthly[0]?.trend_lines || [];
            res.json({
                success: true,
                weekly: {
                    trend: recentWeekly[0]?.trend || 'stable',
                    trend_lines: weeklyTrends,
                },
                monthly: {
                    trend: recentMonthly[0]?.weekly_trend_composite || 'stable',
                    trend_lines: monthlyTrends,
                },
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/by-type/:event_type
     * Get all events of a specific type
     *
     * Params:
     * - event_type: ARPS_DELTA | PIPELINE_RUN | ...
     * - limit: number (default: 100)
     */
    router.get('/by-type/:event_type', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const events = await store.query({
                event_type: req.params.event_type,
                limit,
            });
            res.json({
                success: true,
                event_type: req.params.event_type,
                total: events.length,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/by-agent/:agent_name
     * Get all events from a specific agent
     *
     * Params:
     * - agent_name: string
     * - limit: number (default: 100)
     */
    router.get('/by-agent/:agent_name', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const events = await store.query({
                source_agent: req.params.agent_name,
                limit,
            });
            res.json({
                success: true,
                agent: req.params.agent_name,
                total: events.length,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/by-session/:session_id
     * Get all events from a session
     *
     * Params:
     * - session_id: string
     */
    router.get('/by-session/:session_id', async (req, res) => {
        try {
            const events = await store.query({
                session_id: req.params.session_id,
                limit: 10000,
            });
            res.json({
                success: true,
                session_id: req.params.session_id,
                total: events.length,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/by-correlation/:correlation_id
     * Get all events with a correlation ID (trace)
     *
     * Params:
     * - correlation_id: string
     */
    router.get('/by-correlation/:correlation_id', async (req, res) => {
        try {
            const events = await store.query({
                correlation_id: req.params.correlation_id,
                limit: 10000,
            });
            res.json({
                success: true,
                correlation_id: req.params.correlation_id,
                total: events.length,
                events,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/stats
     * Get memory store statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            const stats = await store.getStats();
            res.json({
                success: true,
                stats,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /memory/insights
     * Get high-level insights from recent data
     */
    router.get('/insights', async (req, res) => {
        try {
            const recentWeekly = await synthesizer.getRecentWeeklySummaries(1);
            const recentMonthly = await synthesizer.getRecentMonthlySummaries(1);
            const weekly = recentWeekly[0];
            const monthly = recentMonthly[0];
            res.json({
                success: true,
                insights: {
                    week: {
                        trend: weekly?.trend,
                        observations: weekly?.observations || [],
                        recommendations: weekly?.recommendations || [],
                    },
                    month: {
                        trend: monthly?.weekly_trend_composite,
                        risk_signals: monthly?.risk_signals || [],
                        capability_growth: monthly?.capability_growth || [],
                    },
                },
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * POST /memory/synthesize
     * Trigger synthesis of weekly/monthly summaries
     *
     * Body:
     * - period: weekly | monthly
     */
    router.post('/synthesize', async (req, res) => {
        try {
            const period = req.body.period || 'weekly';
            let result;
            if (period === 'monthly') {
                result = await synthesizer.generateMonthlySummary();
            }
            else {
                result = await synthesizer.generateWeeklySummary();
            }
            res.json({
                success: true,
                period,
                summary: result,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    });
    return router;
}
//# sourceMappingURL=MemoryAPI.js.map