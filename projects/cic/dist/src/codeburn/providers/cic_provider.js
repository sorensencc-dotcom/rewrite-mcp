import fs from "node:fs";
import path from "node:path";
const LLMS_PATH = process.env.CIC_TELEMETRY_LLM_CALLS ||
    path.join(process.env.HOME || ".", ".cic", "logs", "telemetry", "llm_calls.jsonl");
const COST_EVENTS_PATH = process.env.CIC_TELEMETRY_COST_EVENTS ||
    path.join(process.env.HOME || ".", ".cic", "logs", "telemetry", "cost_events.jsonl");
/**
 * Load and normalize CIC LLM call events from telemetry log
 */
export function loadCicLlmEvents() {
    if (!fs.existsSync(LLMS_PATH)) {
        console.log(`[CodeBurn CIC Provider] No LLM events found at ${LLMS_PATH}`);
        return [];
    }
    try {
        const lines = fs.readFileSync(LLMS_PATH, "utf8").split("\n").filter(Boolean);
        return lines.map((line) => {
            const raw = JSON.parse(line);
            return {
                provider: raw.provider || "anthropic",
                model: raw.model || "unknown",
                input_tokens: raw.input_tokens || 0,
                output_tokens: raw.output_tokens || 0,
                cache_read_tokens: raw.cache_read_tokens || 0,
                cache_write_tokens: raw.cache_write_tokens || 0,
                timestamp: raw.timestamp,
                metadata: {
                    agent: raw.agent,
                    task_type: raw.task_type,
                    pipeline_stage: raw.pipeline_stage,
                    project: raw.project,
                    session_id: raw.session_id,
                    correlation_id: raw.correlation_id,
                    latency_ms: raw.latency_ms,
                    retry_count: raw.retry_count
                }
            };
        });
    }
    catch (err) {
        console.error(`[CodeBurn CIC Provider] Error reading LLM events: ${err}`);
        return [];
    }
}
/**
 * Load and normalize CIC cost events
 */
export function loadCicCostEvents() {
    if (!fs.existsSync(COST_EVENTS_PATH)) {
        return [];
    }
    try {
        const lines = fs.readFileSync(COST_EVENTS_PATH, "utf8").split("\n").filter(Boolean);
        return lines.map((line) => {
            const raw = JSON.parse(line);
            return {
                provider: raw.provider || "anthropic",
                model: raw.model || "unknown",
                input_tokens: raw.input_tokens || 0,
                output_tokens: raw.output_tokens || 0,
                cache_read_tokens: raw.cache_read_tokens || 0,
                cache_write_tokens: raw.cache_write_tokens || 0,
                timestamp: raw.timestamp,
                metadata: {
                    agent: raw.agent,
                    pipeline_stage: raw.pipeline_stage,
                    project: raw.project,
                    total_cost_usd: raw.total_cost_usd,
                    session_id: raw.session_id
                }
            };
        });
    }
    catch (err) {
        console.error(`[CodeBurn CIC Provider] Error reading cost events: ${err}`);
        return [];
    }
}
export function aggregateToModelStats(events) {
    const byModel = new Map();
    events.forEach((event) => {
        const key = `${event.provider}:${event.model}`;
        if (!byModel.has(key)) {
            byModel.set(key, []);
        }
        byModel.get(key).push(event);
    });
    const stats = [];
    byModel.forEach((events, key) => {
        const [provider, model] = key.split(":");
        const totalInput = events.reduce((sum, e) => sum + e.input_tokens, 0);
        const totalOutput = events.reduce((sum, e) => sum + e.output_tokens, 0);
        const totalCacheRead = events.reduce((sum, e) => sum + e.cache_read_tokens, 0);
        const totalCacheWrite = events.reduce((sum, e) => sum + e.cache_write_tokens, 0);
        const avgCost = events.reduce((sum, e) => sum + e.metadata.total_cost_usd || 0, 0) / Math.max(events.length, 1);
        const avgRetry = events.reduce((sum, e) => sum + (e.metadata.retry_count || 0), 0) / Math.max(events.length, 1);
        const stages = [...new Set(events.map((e) => e.metadata.pipeline_stage).filter(Boolean))];
        const agents = [...new Set(events.map((e) => e.metadata.agent).filter(Boolean))];
        stats.push({
            model,
            provider,
            usage_count: events.length,
            total_input_tokens: totalInput,
            total_output_tokens: totalOutput,
            total_cache_read_tokens: totalCacheRead,
            total_cache_write_tokens: totalCacheWrite,
            avg_cost_usd: avgCost,
            avg_retry_rate: avgRetry,
            success_rate: 1 - Math.min(avgRetry / 10, 1), // Rough estimate
            pipeline_stages: stages,
            agents
        });
    });
    return stats;
}
/**
 * Export CIC telemetry for CodeBurn analysis
 */
export function exportCicTelemetry(outputPath) {
    const exportPath = outputPath || path.join(process.env.HOME || ".", ".codeburn", "exports", "cic_telemetry.json");
    const exportDir = path.dirname(exportPath);
    fs.mkdirSync(exportDir, { recursive: true });
    const llmEvents = loadCicLlmEvents();
    const costEvents = loadCicCostEvents();
    const stats = aggregateToModelStats([...llmEvents, ...costEvents]);
    const output = {
        exported_at: new Date().toISOString(),
        total_events: llmEvents.length + costEvents.length,
        model_stats: stats,
        event_samples: {
            llm_calls: llmEvents.slice(0, 100),
            cost_events: costEvents.slice(0, 100)
        }
    };
    fs.writeFileSync(exportPath, JSON.stringify(output, null, 2), "utf8");
    console.log(`[CodeBurn CIC Provider] ✅ Exported telemetry to ${exportPath}`);
}
//# sourceMappingURL=cic_provider.js.map