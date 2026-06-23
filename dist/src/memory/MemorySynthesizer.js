"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySynthesizer = void 0;
exports.getMemorySynthesizer = getMemorySynthesizer;
exports.resetMemorySynthesizer = resetMemorySynthesizer;
class MemorySynthesizer {
    constructor(store) {
        this.summaries = [];
        this.store = store;
    }
    /**
     * Generate weekly summary from last 7 days of events
     */
    async generateWeeklySummary() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const events = await this.store.query({
            after_timestamp: sevenDaysAgo.toISOString(),
            before_timestamp: now.toISOString(),
        });
        const eventCounts = this.countEventsByType(events);
        const totalEvents = events.length;
        const summary = {
            id: `weekly_${now.toISOString().split('T')[0]}`,
            period: 'weekly',
            start_date: sevenDaysAgo.toISOString(),
            end_date: now.toISOString(),
            generated_at: now.toISOString(),
            event_count: totalEvents,
            event_counts_by_type: eventCounts,
            key_deltas: this.extractKeyDeltas(events),
            trend: this.analyzeTrend(events),
            trend_lines: this.calculateTrendLines(events),
            observations: this.generateObservations(events, eventCounts),
            recommendations: this.generateRecommendations(events, eventCounts),
        };
        this.summaries.push(summary);
        return summary;
    }
    /**
     * Generate monthly evolution report from last 30 days
     */
    async generateMonthlySummary() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const events = await this.store.query({
            after_timestamp: thirtyDaysAgo.toISOString(),
            before_timestamp: now.toISOString(),
        });
        const eventCounts = this.countEventsByType(events);
        const summary = {
            id: `monthly_${now.toISOString().split('T')[0]}`,
            period: 'monthly',
            start_date: thirtyDaysAgo.toISOString(),
            end_date: now.toISOString(),
            generated_at: now.toISOString(),
            event_count: events.length,
            event_counts_by_type: eventCounts,
            total_weeks: 4,
            weekly_trend_composite: this.analyzeTrend(events),
            trend_lines: this.calculateTrendLines(events),
            pattern_analysis: this.analyzePatterns(events),
            risk_signals: this.detectRiskSignals(events),
            capability_growth: this.detectCapabilityGrowth(events),
            observations: this.generateMonthlyObservations(events),
        };
        this.summaries.push(summary);
        return summary;
    }
    /**
     * Get all summaries (weekly and monthly)
     */
    async getAllSummaries() {
        return [...this.summaries];
    }
    /**
     * Get recent weekly summaries
     */
    async getRecentWeeklySummaries(count = 4) {
        return this.summaries
            .filter(s => s.period === 'weekly')
            .slice(-count);
    }
    /**
     * Get recent monthly summaries
     */
    async getRecentMonthlySummaries(count = 3) {
        return this.summaries
            .filter(s => s.period === 'monthly')
            .slice(-count);
    }
    // Private methods
    countEventsByType(events) {
        const counts = {};
        for (const event of events) {
            counts[event.event_type] = (counts[event.event_type] || 0) + 1;
        }
        return counts;
    }
    extractKeyDeltas(events) {
        const deltas = [];
        // ARPS_DELTA events are already deltas
        const arpsDeltaEvents = events.filter(e => e.event_type === 'ARPS_DELTA');
        for (const evt of arpsDeltaEvents.slice(-5)) {
            const payload = evt.payload;
            if (payload.change_type === 'phase_completion') {
                deltas.push(`Phase ${payload.phase_id} completed`);
            }
            else if (payload.change_type === 'phase_creation') {
                deltas.push(`Phase ${payload.phase_id} created`);
            }
            else if (payload.change_type === 'prompt_rewrite') {
                deltas.push(`System prompt rewritten`);
            }
        }
        return deltas.slice(0, 5);
    }
    analyzeTrend(events) {
        if (events.length === 0)
            return 'stable';
        // Calculate error rate from PIPELINE_RUN and AGENT_TELEMETRY events
        const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
        const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
        let totalErrors = 0;
        let totalRuns = 0;
        for (const evt of pipelineRuns) {
            const payload = evt.payload;
            totalRuns++;
            totalErrors += payload.items_failed || 0;
        }
        for (const evt of agentTelemetry) {
            const payload = evt.payload;
            if (payload.status === 'degraded' || payload.status === 'failed') {
                totalErrors++;
            }
            totalRuns++;
        }
        if (totalRuns === 0)
            return 'stable';
        const errorRate = totalErrors / totalRuns;
        if (errorRate < 0.02)
            return 'improving';
        if (errorRate > 0.1)
            return 'degrading';
        return 'stable';
    }
    calculateTrendLines(events) {
        const trends = [];
        // Pipeline success rate trend
        const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
        if (pipelineRuns.length > 0) {
            const successCount = pipelineRuns.filter((e) => e.payload.status === 'success').length;
            const successRate = successCount / pipelineRuns.length;
            trends.push({
                metric: 'pipeline_success_rate',
                baseline: 0.95,
                current: successRate,
                delta: successRate - 0.95,
                percent_change: ((successRate - 0.95) / 0.95) * 100,
                direction: successRate >= 0.95 ? 'improving' : 'degrading',
            });
        }
        // Agent health trend
        const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
        if (agentTelemetry.length > 0) {
            const healthyAgents = agentTelemetry.filter((e) => e.payload.status === 'healthy').length;
            const healthRate = healthyAgents / agentTelemetry.length;
            trends.push({
                metric: 'agent_health_rate',
                baseline: 0.98,
                current: healthRate,
                delta: healthRate - 0.98,
                percent_change: ((healthRate - 0.98) / 0.98) * 100,
                direction: healthRate >= 0.98 ? 'improving' : 'degrading',
            });
        }
        // Governance signal rate (approvals)
        const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
        if (govSignals.length > 0) {
            const approvals = govSignals.filter((e) => e.payload.decision === 'approved').length;
            const approvalRate = approvals / govSignals.length;
            trends.push({
                metric: 'approval_rate',
                baseline: 0.9,
                current: approvalRate,
                delta: approvalRate - 0.9,
                percent_change: ((approvalRate - 0.9) / 0.9) * 100,
                direction: approvalRate >= 0.9 ? 'improving' : 'degrading',
            });
        }
        return trends;
    }
    generateObservations(events, eventCounts) {
        const observations = [];
        const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);
        if (totalEvents === 0) {
            observations.push('No events recorded in period.');
            return observations;
        }
        // Event distribution
        const pipelinePercent = ((eventCounts['PIPELINE_RUN'] || 0) / totalEvents * 100).toFixed(1);
        observations.push(`${pipelinePercent}% of events are pipeline runs`);
        const agentPercent = ((eventCounts['AGENT_TELEMETRY'] || 0) / totalEvents * 100).toFixed(1);
        observations.push(`${agentPercent}% are agent telemetry signals`);
        // Governance activity
        if ((eventCounts['GOVERNANCE_SIGNAL'] || 0) > 0) {
            observations.push(`${eventCounts['GOVERNANCE_SIGNAL']} governance signals processed`);
        }
        // Planning activity
        if ((eventCounts['APR_PLAN'] || 0) > 0) {
            observations.push(`${eventCounts['APR_PLAN']} autonomous plans generated`);
        }
        // Execution activity
        if ((eventCounts['CRO_RUN'] || 0) > 0) {
            observations.push(`${eventCounts['CRO_RUN']} execution runs completed`);
        }
        return observations;
    }
    generateRecommendations(events, eventCounts) {
        const recommendations = [];
        // Check for low pipeline activity
        if ((eventCounts['PIPELINE_RUN'] || 0) < 5) {
            recommendations.push('Low pipeline activity - consider increasing ingestion frequency');
        }
        // Check for agent degradation
        const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
        const degradedAgents = agentTelemetry.filter((e) => e.payload.status === 'degraded' || e.payload.status === 'failed');
        if (degradedAgents.length > 0) {
            recommendations.push(`${degradedAgents.length} agent(s) degraded - investigate performance issues`);
        }
        // Check for governance rejections
        const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
        const rejections = govSignals.filter((e) => e.payload.decision === 'rejected');
        if (rejections.length > 2) {
            recommendations.push('High rejection rate in governance - review policy constraints');
        }
        return recommendations;
    }
    analyzePatterns(events) {
        const patterns = [];
        // ARPS evolution pattern
        const arpsDeltaEvents = events.filter(e => e.event_type === 'ARPS_DELTA');
        if (arpsDeltaEvents.length > 5) {
            patterns.push('High frequency of roadmap/prompt evolution detected');
        }
        // Planning pattern
        const aprPlans = events.filter(e => e.event_type === 'APR_PLAN');
        if (aprPlans.length > 0) {
            const avgConsensus = aprPlans.reduce((sum, e) => sum + (e.payload.agent_consensus_score || 0), 0) / aprPlans.length;
            if (avgConsensus > 0.9) {
                patterns.push('Multi-agent planning shows high consensus (>90%)');
            }
            else if (avgConsensus < 0.7) {
                patterns.push('Multi-agent planning shows low consensus (<70%) - check agreement');
            }
        }
        // Execution pattern
        const croRuns = events.filter(e => e.event_type === 'CRO_RUN');
        const failedRuns = croRuns.filter((e) => e.payload.status === 'failed');
        if (failedRuns.length > 0 && croRuns.length > 0) {
            const failureRate = failedRuns.length / croRuns.length;
            patterns.push(`Execution failure rate: ${(failureRate * 100).toFixed(1)}%`);
        }
        return patterns;
    }
    detectRiskSignals(events) {
        const risks = [];
        // High error rate
        const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
        const errorRuns = pipelineRuns.filter((e) => e.payload.status === 'failed' || e.payload.status === 'partial');
        if (errorRuns.length > pipelineRuns.length * 0.2) {
            risks.push('⚠️ Pipeline failure rate exceeds 20% - investigate root causes');
        }
        // Agent health degradation
        const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
        const failedAgents = agentTelemetry.filter((e) => e.payload.status === 'failed');
        if (failedAgents.length > 0) {
            risks.push(`⚠️ ${failedAgents.length} agent(s) in failed state - immediate attention needed`);
        }
        // Low approval rate
        const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
        const rejections = govSignals.filter((e) => e.payload.decision === 'rejected');
        if (rejections.length > govSignals.length * 0.3) {
            risks.push('⚠️ Governance rejection rate high - policy may be too strict');
        }
        return risks;
    }
    detectCapabilityGrowth(events) {
        const growth = [];
        // APR plan generation (indicates planning capability)
        const aprPlans = events.filter(e => e.event_type === 'APR_PLAN');
        if (aprPlans.length > 5) {
            growth.push('Autonomous planning capability demonstrated (5+ plans generated)');
        }
        // CRO execution (indicates execution capability)
        const croRuns = events.filter(e => e.event_type === 'CRO_RUN');
        if (croRuns.length > 3) {
            growth.push('Multi-agent execution capability demonstrated (3+ runs completed)');
        }
        // Governance signals (indicates approval capability)
        const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
        if (govSignals.length > 10) {
            growth.push('Governance processing at scale (10+ signals processed)');
        }
        return growth;
    }
    generateMonthlyObservations(events) {
        const observations = [];
        const totalEvents = events.length;
        observations.push(`Monthly event count: ${totalEvents}`);
        // Trend composites
        const eventCounts = this.countEventsByType(events);
        observations.push(`Event distribution: ${JSON.stringify(eventCounts)}`);
        // Month-over-month
        const trend = this.analyzeTrend(events);
        observations.push(`Monthly trend: ${trend.toUpperCase()}`);
        return observations;
    }
}
exports.MemorySynthesizer = MemorySynthesizer;
// Singleton instance
let synthesizerInstance = null;
async function getMemorySynthesizer(store) {
    if (!synthesizerInstance) {
        synthesizerInstance = new MemorySynthesizer(store);
    }
    return synthesizerInstance;
}
function resetMemorySynthesizer() {
    synthesizerInstance = null;
}
//# sourceMappingURL=MemorySynthesizer.js.map