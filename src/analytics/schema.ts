/**
 * @file schema.ts
 * @description Zod runtime schema validators for Agent Telemetry events.
 */

import { z } from 'zod';

export const AgentStepStatusSchema = z.enum(['SUCCESS', 'ERROR', 'CANCELLED']);

export const AgentTelemetryEventSchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
  step_index: z.number().int().nonnegative('step_index must be >= 0'),
  timestamp: z.string().datetime({ message: 'timestamp must be valid ISO 8601' }),
  agent_role: z.string().min(1, 'agent_role is required'),
  model: z.string().min(1, 'model is required'),
  prompt_tokens: z.number().int().nonnegative().default(0),
  completion_tokens: z.number().int().nonnegative().default(0),
  tool_name: z.string().nullable().optional(),
  duration_ms: z.number().nonnegative().default(0),
  status: AgentStepStatusSchema,
  error_type: z.string().nullable().optional(),
  exit_code: z.number().int().nullable().optional(),
});

export type AgentTelemetryEventInput = z.infer<typeof AgentTelemetryEventSchema>;

/**
 * Validates a single telemetry record. Returns { success: true, data } or { success: false, error }.
 */
export function validateTelemetryEvent(data: unknown) {
  return AgentTelemetryEventSchema.safeParse(data);
}
