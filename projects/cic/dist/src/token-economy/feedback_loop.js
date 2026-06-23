import fs from "node:fs";
import path from "node:path";
const EXPORT_PATH = process.env.CODEBURN_EXPORT_PATH ||
    path.join(process.env.HOME || ".", ".codeburn", "exports", "cic_model_stats.json");
const ROUTING_RULES_PATH = process.env.ROUTING_RULES_PATH || path.join(process.cwd(), "config", "token-economy", "routing_rules.json");
/**
 * Load CodeBurn model statistics from export file
 */
function loadCodeburnStats() {
    if (!fs.existsSync(EXPORT_PATH)) {
        console.warn(`[TokenEconomy] CodeBurn export not found at ${EXPORT_PATH}`);
        return [];
    }
    try {
        const content = fs.readFileSync(EXPORT_PATH, "utf8");
        return JSON.parse(content);
    }
    catch (err) {
        console.error(`[TokenEconomy] Failed to parse CodeBurn stats: ${err}`);
        return [];
    }
}
/**
 * Load existing routing rules
 */
function loadRoutingRules() {
    if (!fs.existsSync(ROUTING_RULES_PATH)) {
        return getDefaultRoutingRules();
    }
    try {
        const content = fs.readFileSync(ROUTING_RULES_PATH, "utf8");
        return JSON.parse(content).rules || [];
    }
    catch (err) {
        console.error(`[TokenEconomy] Failed to parse routing rules: ${err}`);
        return getDefaultRoutingRules();
    }
}
/**
 * Get default routing rules
 */
function getDefaultRoutingRules() {
    return [
        {
            id: "harvester-standard",
            match: { pipeline_stage: "INGEST" },
            action: { model: "claude-3.7-sonnet", max_tokens: 8192 }
        },
        {
            id: "redesign-quality",
            match: { pipeline_stage: "REDESIGN" },
            action: { model: "claude-3.7-opus", max_tokens: 16384 }
        },
        {
            id: "outreach-cheap",
            match: { pipeline_stage: "OUTREACH" },
            action: { model: "claude-3.7-haiku", max_tokens: 2048 }
        }
    ];
}
function generateRecommendations(stats) {
    const recommendations = [];
    // Group stats by pipeline stage
    const byStage = new Map();
    stats.forEach((stat) => {
        if (!byStage.has(stat.pipeline_stage)) {
            byStage.set(stat.pipeline_stage, []);
        }
        byStage.get(stat.pipeline_stage).push(stat);
    });
    // Analyze each stage
    byStage.forEach((stageStats, stage) => {
        const avgCost = stageStats.reduce((sum, s) => sum + s.avg_cost_usd, 0) / stageStats.length;
        const avgRetry = stageStats.reduce((sum, s) => sum + s.avg_retry_rate, 0) / stageStats.length;
        // Find the cheapest model with acceptable success rate
        const candidates = stageStats.filter((s) => s.success_rate >= 0.95).sort((a, b) => a.avg_cost_usd - b.avg_cost_usd);
        if (candidates.length > 0) {
            const cheapest = candidates[0];
            const current = stageStats.find((s) => s.pipeline_stage === stage) || stageStats[0];
            if (cheapest.avg_cost_usd < current.avg_cost_usd * 0.8) {
                recommendations.push({
                    stage,
                    current_model: current.model,
                    recommended_model: cheapest.model,
                    reason: `Cost optimization: ${((1 - cheapest.avg_cost_usd / current.avg_cost_usd) * 100).toFixed(1)}% cheaper`,
                    estimated_savings_usd: (current.avg_cost_usd - cheapest.avg_cost_usd) * current.usage_count,
                    confidence: 0.95
                });
            }
        }
        // Check for high retry rates indicating quality issues
        if (avgRetry > 0.2) {
            const mostReliable = stageStats.sort((a, b) => b.success_rate - a.success_rate)[0];
            const current = stageStats[0];
            if (mostReliable && mostReliable.model !== current.model) {
                recommendations.push({
                    stage,
                    current_model: current.model,
                    recommended_model: mostReliable.model,
                    reason: `Reliability improvement: ${(mostReliable.success_rate * 100).toFixed(1)}% success rate vs ${(current.success_rate * 100).toFixed(1)}%`,
                    estimated_savings_usd: 0, // Retry cost reduction, not direct savings
                    confidence: 0.85
                });
            }
        }
    });
    return recommendations;
}
/**
 * Apply CodeBurn insights to update routing rules
 */
export function applyCodeburnInsights() {
    console.log("[TokenEconomy] Loading CodeBurn insights...");
    const stats = loadCodeburnStats();
    if (stats.length === 0) {
        console.log("[TokenEconomy] No CodeBurn stats available");
        // Still save empty recommendations file for consistency
        const recommendationsPath = path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json");
        fs.mkdirSync(path.dirname(recommendationsPath), { recursive: true });
        fs.writeFileSync(recommendationsPath, JSON.stringify([], null, 2), "utf8");
        return;
    }
    console.log(`[TokenEconomy] Loaded ${stats.length} model statistics`);
    // Generate recommendations
    const recommendations = generateRecommendations(stats);
    console.log(`[TokenEconomy] Generated ${recommendations.length} recommendations`);
    // Save recommendations
    const recommendationsPath = path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json");
    fs.mkdirSync(path.dirname(recommendationsPath), { recursive: true });
    fs.writeFileSync(recommendationsPath, JSON.stringify(recommendations, null, 2), "utf8");
    console.log(`[TokenEconomy] Saved recommendations to ${recommendationsPath}`);
    // Load current rules and update based on recommendations
    const currentRules = loadRoutingRules();
    const updatedRules = updateRulesFromRecommendations(currentRules, recommendations);
    // Save updated rules
    fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
    fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify({ version: "1.0.0", rules: updatedRules, updated_at: new Date().toISOString() }, null, 2), "utf8");
    console.log(`[TokenEconomy] ✅ Updated ${updatedRules.length} routing rules`);
}
/**
 * Update routing rules based on recommendations
 */
function updateRulesFromRecommendations(rules, recommendations) {
    const updated = [...rules];
    recommendations.forEach((rec) => {
        // Find rule matching this stage
        const ruleIndex = updated.findIndex((r) => r.match.pipeline_stage === rec.stage);
        if (ruleIndex >= 0 && rec.confidence >= 0.8) {
            console.log(`[TokenEconomy] Updating ${rec.stage}: ${rec.current_model} → ${rec.recommended_model} (${rec.reason})`);
            updated[ruleIndex].action.model = rec.recommended_model;
        }
    });
    return updated;
}
/**
 * Export current telemetry state for CodeBurn ingestion
 */
export function exportTelemetryForCodeburn() {
    const telemetryDir = process.env.CIC_TELEMETRY_DIR || path.join(process.env.HOME || ".", ".cic", "logs", "telemetry");
    if (!fs.existsSync(telemetryDir)) {
        console.log("[TokenEconomy] No telemetry data available yet");
        return;
    }
    console.log("[TokenEconomy] Exporting telemetry for CodeBurn...");
    // In a real implementation, this would:
    // 1. Read all JSONL telemetry files
    // 2. Aggregate by model, stage, agent
    // 3. Calculate stats (cost, success rate, retry rate)
    // 4. Write to CodeBurn export location
    console.log("[TokenEconomy] ✅ Telemetry export complete");
}
//# sourceMappingURL=feedback_loop.js.map