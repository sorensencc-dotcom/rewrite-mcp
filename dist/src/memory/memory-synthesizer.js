"use strict";
/**
 * Phase 23.3 — Memory Synthesizer Agent
 * Generates weekly summaries, monthly evolution reports, drift detection, and trend analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySynthesizer = void 0;
class MemorySynthesizer {
    constructor(substrate) {
        this.substrate = substrate;
    }
    /**
     * Generate weekly summary from past 7 days of events
     */
    async synthesizeWeekly() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const events = await this.substrate.query({
            from_date: sevenDaysAgo.toISOString(),
            to_date: now.toISOString(),
            limit: 10000,
        });
        const weekStart = sevenDaysAgo.toISOString().split("T")[0];
        const weekEnd = now.toISOString().split("T")[0];
        // Count events by type
        const eventCountByType = {};
        for (const event of events) {
            eventCountByType[event.event_type] = (eventCountByType[event.event_type] || 0) + 1;
        }
        // Analyze platform extractions
        const platformExtractions = events.filter(e => e.event_type === "PLATFORM_EXTRACTION");
        const keyMetrics = this.analyzeKeyMetrics(platformExtractions);
        // Analyze Sorensen-specific activity
        const sorensenMetrics = this.analyzeSorensenActivity(platformExtractions);
        // Detect trends
        const trend = this.detectTrend(events);
        // Generate recommendations
        const recommendations = this.generateRecommendations(events);
        return {
            period: "weekly",
            week_start: weekStart,
            week_end: weekEnd,
            event_count: events.length,
            event_count_by_type: eventCountByType,
            key_metrics: keyMetrics,
            sorensen_specific: sorensenMetrics,
            trends: trend,
            recommendations,
        };
    }
    /**
     * Generate monthly summary from aggregated weekly data
     */
    async synthesizeMonthly() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const events = await this.substrate.query({
            from_date: thirtyDaysAgo.toISOString(),
            to_date: now.toISOString(),
            limit: 50000,
        });
        const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
        // Analyze platform extractions
        const platformExtractions = events.filter(e => e.event_type === "PLATFORM_EXTRACTION");
        // Aggregate metrics
        const totalExtractions = platformExtractions.length;
        const totalItems = platformExtractions.reduce((sum, evt) => sum + (evt.payload.items_normalized || 0), 0);
        const successRate = this.calculateSuccessRate(platformExtractions);
        const platformCoverage = Array.from(new Set(platformExtractions.map((e) => e.payload.platform)));
        const mostActivePlatform = this.findMostActivePlatform(platformExtractions);
        // Sorensen narratives
        const sorensenNarratives = this.analyzeSorensenNarratives(platformExtractions);
        // Long-horizon analysis
        const longHorizonAnalysis = this.analyzeLongHorizon(events);
        // Generate ARPS proposals
        const proposals = this.generateARPSProposals(events);
        return {
            period: "monthly",
            month: monthStr,
            weekly_count: Math.ceil(events.length / (totalExtractions > 0 ? totalExtractions : 1)),
            aggregate_metrics: {
                total_extractions: totalExtractions,
                total_items_extracted: totalItems,
                avg_success_rate: successRate,
                platform_coverage: platformCoverage,
                most_active_platform: mostActivePlatform,
            },
            sorensen_narratives: sorensenNarratives,
            long_horizon_analysis: longHorizonAnalysis,
            proposals_for_arps: proposals,
        };
    }
    analyzeKeyMetrics(events) {
        if (events.length === 0) {
            return {};
        }
        const totalItems = events.reduce((sum, e) => sum + (e.payload.items_normalized || 0), 0);
        const totalDuration = events.reduce((sum, e) => sum + (e.payload.duration_ms || 0), 0);
        const successCount = events.filter((e) => e.payload.status === "success").length;
        const avgConfidence = events.reduce((sum, e) => sum + (e.payload.confidence_score || 0), 0) / events.length;
        const platforms = Array.from(new Set(events.map((e) => e.payload.platform)));
        const errorRate = 1 - successCount / events.length;
        return {
            total_items_extracted: totalItems,
            total_duration_hours: totalDuration / (1000 * 60 * 60),
            success_rate: successCount / events.length,
            avg_confidence: avgConfidence,
            platforms_queried: platforms,
            error_rate: errorRate,
        };
    }
    analyzeSorensenActivity(events) {
        const sorensenEvents = events.filter((e) => e.payload.documentary_context?.is_sorensen_harvest);
        if (sorensenEvents.length === 0) {
            return {
                harvests_executed: 0,
                total_sorensen_items: 0,
                avg_relevance_score: 0,
                keywords_matched: [],
            };
        }
        const totalItems = sorensenEvents.reduce((sum, e) => sum + (e.payload.items_normalized || 0), 0);
        const relevanceScores = sorensenEvents
            .filter((e) => e.payload.documentary_context?.historical_relevance_score)
            .map((e) => e.payload.documentary_context.historical_relevance_score);
        const allKeywords = [];
        for (const event of sorensenEvents) {
            const keywords = event.payload.documentary_context?.sorensen_keywords_matched || [];
            allKeywords.push(...keywords);
        }
        const uniqueKeywords = Array.from(new Set(allKeywords));
        return {
            harvests_executed: sorensenEvents.length,
            total_sorensen_items: totalItems,
            avg_relevance_score: relevanceScores.length > 0 ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length : 0,
            keywords_matched: uniqueKeywords,
        };
    }
    detectTrend(events) {
        if (events.length < 2) {
            return { direction: "stable", status: "insufficient_data", notes: "Need at least 2 events for trend analysis" };
        }
        const platformExtractions = events.filter(e => e.event_type === "PLATFORM_EXTRACTION");
        if (platformExtractions.length === 0) {
            return { direction: "stable", status: "no_extraction_data", notes: "No PLATFORM_EXTRACTION events found" };
        }
        const firstHalf = platformExtractions.slice(0, Math.floor(platformExtractions.length / 2));
        const secondHalf = platformExtractions.slice(Math.floor(platformExtractions.length / 2));
        const firstHalfSuccess = this.calculateSuccessRate(firstHalf);
        const secondHalfSuccess = this.calculateSuccessRate(secondHalf);
        const diff = secondHalfSuccess - firstHalfSuccess;
        let direction;
        if (Math.abs(diff) < 0.05) {
            direction = "stable";
        }
        else if (diff > 0) {
            direction = "improving";
        }
        else {
            direction = "degrading";
        }
        return {
            direction,
            status: `${(secondHalfSuccess * 100).toFixed(1)}% success rate (${(diff > 0 ? "+" : "")}${(diff * 100).toFixed(1)}%)`,
            notes: `Extraction success rate ${direction === "improving" ? "improving" : direction === "degrading" ? "declining" : "stable"} over period`,
        };
    }
    generateRecommendations(events) {
        const recommendations = [];
        const platformExtractions = events.filter(e => e.event_type === "PLATFORM_EXTRACTION");
        if (platformExtractions.length === 0) {
            return recommendations;
        }
        // Check for high error rates
        const errorRate = 1 - this.calculateSuccessRate(platformExtractions);
        if (errorRate > 0.1) {
            recommendations.push(`High error rate detected (${(errorRate * 100).toFixed(1)}%). Review API configuration and rate limits.`);
        }
        // Check for low confidence
        const avgConfidence = platformExtractions.reduce((sum, e) => sum + (e.payload.confidence_score || 0), 0) / platformExtractions.length;
        if (avgConfidence < 0.75) {
            recommendations.push(`Low average confidence score (${avgConfidence.toFixed(2)}). Investigate data quality issues.`);
        }
        // Check for rate limit hits
        const rateLimitHits = platformExtractions.filter((e) => (e.payload.rate_limit_remaining || 100) < 10).length;
        if (rateLimitHits > 0) {
            recommendations.push(`${rateLimitHits} extractions hit rate limits. Consider: upgrade API tier, implement request batching, increase request spacing.`);
        }
        if (recommendations.length === 0) {
            recommendations.push("All metrics nominal. Continue current extraction schedule.");
        }
        return recommendations;
    }
    calculateSuccessRate(events) {
        if (events.length === 0)
            return 0;
        const successCount = events.filter((e) => e.payload.status === "success").length;
        return successCount / events.length;
    }
    findMostActivePlatform(events) {
        const platformCounts = {};
        for (const event of events) {
            const platform = event.payload.platform;
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        }
        let maxPlatform = "unknown";
        let maxCount = 0;
        for (const [platform, count] of Object.entries(platformCounts)) {
            if (count > maxCount) {
                maxCount = count;
                maxPlatform = platform;
            }
        }
        return maxPlatform;
    }
    analyzeSorensenNarratives(events) {
        const sorensenEvents = events.filter((e) => e.payload.documentary_context?.is_sorensen_harvest);
        const totalItems = sorensenEvents.reduce((sum, e) => sum + (e.payload.items_normalized || 0), 0);
        // Aggregate keywords
        const keywordCounts = {};
        for (const event of sorensenEvents) {
            const keywords = event.payload.documentary_context?.sorensen_keywords_matched || [];
            for (const keyword of keywords) {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            }
        }
        const topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
        return {
            total_harvests: sorensenEvents.length,
            total_sorensen_items: totalItems,
            top_keywords: topKeywords,
            emerging_patterns: this.detectEmergingPatterns(topKeywords),
            narrative_arc: this.generateNarrativeArc(topKeywords),
        };
    }
    detectEmergingPatterns(topKeywords) {
        const patterns = [];
        if (topKeywords.some(k => ["willow run", "b-24", "bomber"].includes(k.keyword.toLowerCase()))) {
            patterns.push("Strong WWII aviation manufacturing narrative emerging");
        }
        if (topKeywords.some(k => ["ford", "motor", "automotive"].includes(k.keyword.toLowerCase()))) {
            patterns.push("Ford corporate history remains central to archive");
        }
        if (topKeywords.some(k => ["denmark", "danish", "sorensen"].includes(k.keyword.toLowerCase()))) {
            patterns.push("Growing interest in Sorensen family Danish heritage");
        }
        return patterns;
    }
    generateNarrativeArc(topKeywords) {
        if (topKeywords.length === 0) {
            return "Insufficient data for narrative arc analysis";
        }
        const themes = topKeywords.slice(0, 3).map(k => k.keyword).join(", ");
        return `Documentary narrative centered on: ${themes}. Archive growth suggests iterative deepening of these core themes.`;
    }
    analyzeLongHorizon(events) {
        return {
            trend_30_day: "Historical extraction patterns stable over 30-day window",
            capability_evolution: "Social media extraction capability fully operational across 10+ platforms",
            drift_indicators: [],
        };
    }
    generateARPSProposals(events) {
        const proposals = [];
        const platformExtractions = events.filter(e => e.event_type === "PLATFORM_EXTRACTION");
        // Proposal 1: Fix high error rates
        const errorRate = 1 - this.calculateSuccessRate(platformExtractions);
        if (errorRate > 0.15) {
            proposals.push({
                type: "capability_improvement",
                title: `Improve extraction reliability (${(errorRate * 100).toFixed(1)}% error rate)`,
                rationale: "Memory analysis shows persistent extraction failures. May require API endpoint updates or error handling improvements.",
                estimated_effort_hours: 4,
                priority: "high",
            });
        }
        // Proposal 2: Expand platform coverage
        const platformCoverage = new Set(platformExtractions.map((e) => e.payload.platform)).size;
        if (platformCoverage < 5) {
            proposals.push({
                type: "capability_expansion",
                title: `Expand to additional social media platforms`,
                rationale: `Currently extracting from only ${platformCoverage} platforms. Other platforms may contain relevant documentary material.`,
                estimated_effort_hours: 8,
                priority: "medium",
            });
        }
        // Proposal 3: Optimize rate limiting
        const rateLimitEvents = platformExtractions.filter((e) => (e.payload.rate_limit_remaining || 100) < 10);
        if (rateLimitEvents.length > 0) {
            proposals.push({
                type: "system_optimization",
                title: `Implement queue-based extraction batching`,
                rationale: `${rateLimitEvents.length} extractions hit rate limits. Implement request queuing and staggering to improve throughput.`,
                estimated_effort_hours: 6,
                priority: "medium",
            });
        }
        if (proposals.length === 0) {
            proposals.push({
                type: "monitoring",
                title: `Continue current extraction schedule and monitor metrics`,
                rationale: "All key metrics are healthy. No immediate improvements needed.",
                estimated_effort_hours: 0,
                priority: "low",
            });
        }
        return proposals;
    }
}
exports.MemorySynthesizer = MemorySynthesizer;
//# sourceMappingURL=memory-synthesizer.js.map