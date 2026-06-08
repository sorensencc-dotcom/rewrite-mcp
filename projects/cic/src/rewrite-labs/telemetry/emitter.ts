import fs from "node:fs";
import path from "node:path";

/**
 * Redesign Session Event
 * Represents an end-to-end redesign session for an SMB site.
 */
export interface RedesignSessionEvent {
  session_id: string;
  project: string;
  smb_site_id: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  successful: boolean;
  reverted: boolean;
  abandoned: boolean;
  start_time: string;
  end_time: string;
  duration_seconds?: number;
}

/**
 * Stage Event
 * Per-stage metrics within a redesign session.
 */
export interface StageEvent {
  session_id: string;
  stage: "ANALYSIS" | "REDESIGN" | "VALIDATION" | "DEPLOYMENT";
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model: string;
  provider: string;
  timestamp: string;
  retry_count?: number;
  duration_seconds?: number;
}

/**
 * Conversion Event
 * Tracks prospect conversion through outreach pipeline.
 */
export interface ConversionEvent {
  timestamp: string;
  session_id?: string;
  prospect_id: string;
  stage: "LEAD" | "QUALIFIED" | "CONTACTED" | "PROPOSAL_SENT" | "SIGNED" | "REJECTED" | "ABANDONED";
  outcome: "INITIATED" | "PROGRESSED" | "CONVERTED" | "LOST";
  value_usd?: number;
}

const TELEMETRY_DIR =
  process.env.REWRITE_LABS_TELEMETRY_DIR || path.join(process.env.HOME || ".", ".rewrite-labs", "logs", "telemetry");

/**
 * Emit a redesign session event
 */
export function emitRedesignSession(event: RedesignSessionEvent): void {
  const file = path.join(TELEMETRY_DIR, "sessions.jsonl");
  const line = JSON.stringify({ type: "redesign_session", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Emit a stage event
 */
export function emitStageEvent(event: StageEvent): void {
  const file = path.join(TELEMETRY_DIR, "stages.jsonl");
  const line = JSON.stringify({ type: "stage_event", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Emit a conversion event
 */
export function emitConversionEvent(event: ConversionEvent): void {
  const file = path.join(TELEMETRY_DIR, "conversions.jsonl");
  const line = JSON.stringify({ type: "conversion_event", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Helper to create a session event from stage telemetry
 */
export function createSessionEventFromStages(
  session_id: string,
  project: string,
  smb_site_id: string,
  stages: StageEvent[],
  status: { successful: boolean; reverted: boolean; abandoned: boolean }
): RedesignSessionEvent {
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
