import fs from "node:fs";
import path from "node:path";
const TELEMETRY_DIR = process.env.REWRITE_LABS_TELEMETRY_DIR || path.join(process.env.HOME || ".", ".rewrite-labs", "logs", "telemetry");
/**
 * Emit a redesign session event
 */
export function emitRedesignSession(event) {
    const file = path.join(TELEMETRY_DIR, "sessions.jsonl");
    const line = JSON.stringify({ type: "redesign_session", ...event }) + "\n";
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    fs.appendFileSync(file, line, "utf8");
}
/**
 * Emit a stage event
 */
export function emitStageEvent(event) {
    const file = path.join(TELEMETRY_DIR, "stages.jsonl");
    const line = JSON.stringify({ type: "stage_event", ...event }) + "\n";
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    fs.appendFileSync(file, line, "utf8");
}
/**
 * Emit a conversion event
 */
export function emitConversionEvent(event) {
    const file = path.join(TELEMETRY_DIR, "conversions.jsonl");
    const line = JSON.stringify({ type: "conversion_event", ...event }) + "\n";
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    fs.appendFileSync(file, line, "utf8");
}
/**
 * Helper to create a session event from stage telemetry
 */
export function createSessionEventFromStages(session_id, project, smb_site_id, stages, status) {
    const totalInputTokens = stages.reduce((sum, s) => sum + s.input_tokens, 0);
    const totalOutputTokens = stages.reduce((sum, s) => sum + s.output_tokens, 0);
    const totalCostUsd = stages.reduce((sum, s) => sum + s.cost_usd, 0);
    const startTime = stages[0]?.timestamp || new Date().toISOString();
    const endTime = stages[stages.length - 1]?.timestamp || new Date().toISOString();
    return {
        session_id,
        project,
        smb_site_id,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cost_usd: totalCostUsd,
        successful: status.successful,
        reverted: status.reverted,
        abandoned: status.abandoned,
        start_time: startTime,
        end_time: endTime
    };
}
//# sourceMappingURL=emitter.js.map