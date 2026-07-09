/**
 * CoWork MCP Integration Type Definitions
 * Specification: CIC-SPEC-MCP-001 v1.2
 */

export type ContextPayloadType = "workspace_state" | "document_ref" | "collaborator_event";

export interface ContextPayload {
  type: ContextPayloadType;
  content: Record<string, any>;
  metadata?: Record<string, string>;
}

export interface ContextInjectionRequest {
  session_id: string; // UUID
  workspace_id: string; // UUID
  context_payload: ContextPayload;
  idempotency_key: string; // UUID
}

export interface ContextInjectionResponse {
  injection_id: string; // UUID
  status: "accepted" | "deduplicated";
  timestamp: string; // ISO 8601 UTC
  latency_ms: number;
}

export type WebhookEvent =
  | "session.created"
  | "session.updated"
  | "session.closed"
  | "context.injected"
  | "artifact.exported";

export interface WebhookRetryPolicy {
  max_attempts?: number;
  initial_delay_ms?: number;
}

export interface WebhookRegistrationRequest {
  endpoint_url: string; // HTTPS URL
  events: WebhookEvent[];
  secret_token: string; // min 32 chars
  retry_policy?: WebhookRetryPolicy;
}

export interface WebhookRegistration {
  id: string;
  endpoint_url: string;
  events: WebhookEvent[];
  secret_token: string;
  retry_policy: {
    max_attempts: number;
    initial_delay_ms: number;
  };
  created_at: string;
}

export type ArtifactExportFormat = "pdf" | "markdown" | "json";

export interface ArtifactExportRequest {
  notebook_id: string; // UUID
  target_space_id: string; // UUID
  format: ArtifactExportFormat;
  include_metadata?: boolean;
}

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export interface ArtifactExportResponse {
  export_job_id: string; // UUID
  status: ExportJobStatus;
  estimated_completion_seconds: number;
}

export interface ArtifactExportJob {
  export_job_id: string;
  notebook_id: string;
  target_space_id: string;
  format: ArtifactExportFormat;
  include_metadata: boolean;
  status: ExportJobStatus;
  estimated_completion_seconds: number;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  artifact_size_bytes?: number;
}

export interface EventEnvelope {
  event_id: string; // UUID
  event_type: string;
  source: "cowork" | "notebooklm";
  tenant_id: string; // UUID
  user_id: string; // UUID
  timestamp_utc: string; // ISO 8601 UTC
  schema_version: string; // semver (e.g. '2.0.0')
  payload: Record<string, any>;
}

export interface DLQEntry {
  id: string; // UUID
  event: EventEnvelope;
  failed_at: string;
  attempts: number;
  error_message: string;
  error_code: string;
}
