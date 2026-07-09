/**
 * MCP Router
 * Express router implementing CIC-SPEC-MCP-001 v1.2 endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4, validate as validateUuid } from "uuid";
import crypto from "crypto";
import {
  ContextInjectionRequest,
  ContextInjectionResponse,
  WebhookRegistrationRequest,
  WebhookRegistration,
  ArtifactExportRequest,
  ArtifactExportResponse,
  ArtifactExportJob,
  EventEnvelope,
  WebhookEvent,
} from "./types.js";
import { PIIRedactionService } from "./PIIRedactionService.js";
import {
  contextEngineCircuitBreaker,
  mcpDLQService,
  withRetry,
} from "./ResilienceService.js";

export const McpRouter = Router();

// ============================================================================
// IN-MEMORY STORAGE (MOCKED DATABASE)
// ============================================================================

const webhooksStore: WebhookRegistration[] = [];
const exportJobsStore: Record<string, ArtifactExportJob> = {};
const idempotencyStore: Record<string, { response: ContextInjectionResponse; timestamp: number }> = {};

// Session bindings correlation store (§6.3)
const sessionBindingsStore: Record<string, { user_id: string; tenant_id: string }> = {};

// Track active injections for concurrent conflict detection (§4.2 / 409 Conflict)
const activeInjections = new Set<string>();

// ============================================================================
// RATE LIMITER (TOKEN BUCKET) (§4.5)
// ============================================================================

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private limit: number;
  private refillRatePerSecond: number;
  private burst: number;

  constructor(limit: number, windowSeconds: number, burst: number) {
    this.limit = limit;
    this.burst = burst;
    this.refillRatePerSecond = limit / windowSeconds;
    this.tokens = burst;
    this.lastRefill = Date.now();
  }

  public take(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.refillRatePerSecond);
    this.lastRefill = now;
  }

  public getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  public getLimit(): number {
    return this.limit;
  }

  public getResetSeconds(): number {
    this.refill();
    const missingTokens = this.burst - this.tokens;
    if (missingTokens <= 0) return 0;
    return Math.ceil(missingTokens / this.refillRatePerSecond);
  }
}

const rateLimiters: Record<string, TokenBucket> = {};

function getLimiter(tenantId: string, endpoint: string, tier: "Standard" | "Enterprise"): TokenBucket {
  const key = `${tenantId}:${endpoint}`;
  if (!rateLimiters[key]) {
    // Prevent unbounded memory growth
    if (Object.keys(rateLimiters).length >= 10000) {
      resetRateLimiters();
    }

    if (endpoint === "inject") {
      const limit = tier === "Enterprise" ? 1000 : 100;
      const burst = tier === "Enterprise" ? 200 : 20;
      rateLimiters[key] = new TokenBucket(limit, 60, burst);
    } else if (endpoint === "export") {
      const limit = tier === "Enterprise" ? 100 : 10;
      const burst = tier === "Enterprise" ? 25 : 5;
      rateLimiters[key] = new TokenBucket(limit, 60, burst);
    } else {
      // webhooks (50 req / 3600s, burst 10)
      rateLimiters[key] = new TokenBucket(50, 3600, 10);
    }
  }
  return rateLimiters[key];
}

export function resetRateLimiters(): void {
  for (const key of Object.keys(rateLimiters)) {
    delete rateLimiters[key];
  }
}

// ============================================================================
// IDENTITY FEDERATION & AUTHENTICATION MIDDLEWARE (§6.1)
// ============================================================================

export function mockAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  let claims = {
    sub: "user-123",
    email: "test@example.com",
    cowork_role: "Editor",
    tenant_id: "tenant-456",
    workspace_ids: ["space-789"],
    tier: "Standard",
  };

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      if (token.startsWith("{")) {
        claims = { ...claims, ...JSON.parse(token) };
      }
    } catch (e) {
      // Ignore
    }
  }

  if (req.headers["x-tenant-id"]) claims.tenant_id = req.headers["x-tenant-id"] as string;
  if (req.headers["x-tenant-tier"]) claims.tier = req.headers["x-tenant-tier"] as string;
  if (req.headers["x-user-id"]) claims.sub = req.headers["x-user-id"] as string;
  if (req.headers["x-cowork-role"]) claims.cowork_role = req.headers["x-cowork-role"] as string;

  const isViewer = claims.cowork_role === "Viewer";
  if (isViewer && (req.path === "/context/inject" || req.path === "/artifacts/export")) {
    res.status(403).json({ error: "forbidden", message: "Viewer lacks required authorization scopes" });
    return;
  }

  (req as any).userContext = {
    user_id: claims.sub,
    email: claims.email,
    notebook_role: claims.cowork_role,
    tenant_id: claims.tenant_id,
    allowed_spaces: claims.workspace_ids,
    tier: claims.tier,
  };

  next();
}

// ============================================================================
// ENDPOINTS
// ============================================================================

let mockDownstreamFailureRate = 0;
export function setDownstreamFailureRate(rate: number): void {
  mockDownstreamFailureRate = rate;
}

/**
 * 1. Context Injection Endpoint (§4.2)
 */
McpRouter.post(
  "/context/inject",
  mockAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const user = (req as any).userContext;
    const { session_id, workspace_id, context_payload, idempotency_key } = req.body as ContextInjectionRequest;

    // Schema Validation
    if (!session_id || !workspace_id || !context_payload || !idempotency_key) {
      res.status(400).json({ error: "bad_request", message: "Missing required fields: session_id, workspace_id, context_payload, idempotency_key" });
      return;
    }

    if (!validateUuid(session_id) || !validateUuid(workspace_id) || !validateUuid(idempotency_key)) {
      res.status(400).json({ error: "bad_request", message: "session_id, workspace_id, and idempotency_key must be valid UUIDs" });
      return;
    }

    const payloadType = context_payload.type;
    if (payloadType !== "workspace_state" && payloadType !== "document_ref" && payloadType !== "collaborator_event") {
      res.status(400).json({ error: "bad_request", message: "Invalid context payload type" });
      return;
    }

    // Business Logic Validation: 422 Unprocessable Entity (e.g. unknown session ID)
    if (session_id === "00000000-0000-0000-0000-000000000000") {
      res.status(422).json({ error: "unprocessable_entity", message: "Unknown session_id: business validation failed" });
      return;
    }

    // Session Binding sub <-> user_id Correlation Check (§6.3)
    if (sessionBindingsStore[session_id]) {
      const binding = sessionBindingsStore[session_id];
      if (binding.user_id !== user.user_id) {
        res.status(403).json({
          error: "forbidden",
          message: "Session binding mismatch: sub claim does not match bound user_id",
        });
        return;
      }
    } else {
      // Create session binding correlation record
      sessionBindingsStore[session_id] = {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
      };
    }

    // Concurrent Injection Conflict check (§4.2 / 409 Conflict)
    if (activeInjections.has(session_id)) {
      res.status(409).json({
        error: "conflict",
        message: "Session state conflict: concurrent injection in progress for this session_id",
      });
      return;
    }

    // Circuit Breaker enforcement (§7.2)
    if (contextEngineCircuitBreaker.getState() === "OPEN") {
      res.setHeader("X-MCP-Circuit", "open");
      res.status(503).json({ error: "service_unavailable", message: "Circuit breaker is OPEN. Downstream Context Engine is unavailable." });
      return;
    }

    // Rate Limit enforcement (§4.5)
    const limiter = getLimiter(user.tenant_id, "inject", user.tier);
    res.setHeader("X-RateLimit-Limit", limiter.getLimit().toString());
    res.setHeader("X-RateLimit-Remaining", limiter.getRemaining().toString());
    res.setHeader("X-RateLimit-Reset", limiter.getResetSeconds().toString());

    if (!limiter.take()) {
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "rate_limit_exceeded", message: "Too many context injection requests." });
      return;
    }

    // Idempotency Deduplication check (§4.2)
    if (idempotencyStore[idempotency_key]) {
      const cached = idempotencyStore[idempotency_key];
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        res.status(200).json({
          ...cached.response,
          status: "deduplicated",
          latency_ms: Date.now() - startTime,
        });
        return;
      }
    }

    // Track active injection
    activeInjections.add(session_id);

    try {
      // PII Redaction Scan (§8.4)
      const scanMode = context_payload.metadata?.pii_scan_mode === "regex_only" ? "regex_only" : "full";
      const redactedPayload = PIIRedactionService.redactPayload(context_payload, scanMode);

      // Call downstream with Retry policy (§7.1)
      await withRetry(
        async (attempt) => {
          // Downstream call simulation latency (enables 409 Conflict overlap test)
          await new Promise(resolve => setTimeout(resolve, 10));
          if (mockDownstreamFailureRate > 0 && Math.random() < mockDownstreamFailureRate) {
            throw new Error(`Downstream Context Engine error (Simulated, Attempt ${attempt})`);
          }
          return true;
        },
        (err) => true,
        {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        }
      );

      // Record success in Circuit Breaker
      contextEngineCircuitBreaker.recordSuccess();

      // Create success response
      const injection_id = uuidv4();
      const response: ContextInjectionResponse = {
        injection_id,
        status: "accepted",
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
      };

      // Store in idempotency cache
      idempotencyStore[idempotency_key] = {
        response,
        timestamp: Date.now(),
      };

      // Create event envelope and dispatch webhook (§5.1)
      const event: EventEnvelope = {
        event_id: uuidv4(),
        event_type: "context.injected",
        source: "notebooklm",
        tenant_id: user.tenant_id,
        user_id: user.user_id,
        timestamp_utc: new Date().toISOString(),
        schema_version: "2.0.0",
        payload: {
          injection_id,
          session_id,
          workspace_id,
          context_type: payloadType,
          redacted_content: redactedPayload.content,
        },
      };

      dispatchWebhookEvent(event);

      res.status(200).json(response);
    } catch (err: any) {
      contextEngineCircuitBreaker.recordFailure();

      const errorEvent: EventEnvelope = {
        event_id: uuidv4(),
        event_type: "error.mcp_failure",
        source: "notebooklm",
        tenant_id: user.tenant_id,
        user_id: user.user_id,
        timestamp_utc: new Date().toISOString(),
        schema_version: "2.0.0",
        payload: {
          error_code: "mcp_failure",
          error_message: err.message,
          session_id,
          workspace_id,
        },
      };

      mcpDLQService.push(errorEvent, err, "mcp_failure", 3);

      res.status(500).json({ error: "internal_error", message: err.message });
    } finally {
      // Remove from active injections
      activeInjections.delete(session_id);
    }
  }
);

/**
 * 2. Session Webhook Registration (§4.3)
 */
McpRouter.post(
  "/webhooks",
  mockAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).userContext;
    const { endpoint_url, events, secret_token, retry_policy } = req.body as WebhookRegistrationRequest;

    // Rate Limiting
    const limiter = getLimiter(user.tenant_id, "webhooks", user.tier);
    res.setHeader("X-RateLimit-Limit", limiter.getLimit().toString());
    res.setHeader("X-RateLimit-Remaining", limiter.getRemaining().toString());
    res.setHeader("X-RateLimit-Reset", limiter.getResetSeconds().toString());

    if (!limiter.take()) {
      res.status(429).json({ error: "rate_limit_exceeded", message: "Too many webhook registration requests." });
      return;
    }

    if (!endpoint_url || !events || !secret_token) {
      res.status(400).json({ error: "bad_request", message: "Missing required fields: endpoint_url, events, secret_token" });
      return;
    }

    if (!endpoint_url.startsWith("https://")) {
      res.status(400).json({ error: "bad_request", message: "endpoint_url must use HTTPS protocol" });
      return;
    }

    if (secret_token.length < 32) {
      res.status(400).json({ error: "bad_request", message: "secret_token must be at least 32 characters" });
      return;
    }

    const validEvents: WebhookEvent[] = [
      "session.created",
      "session.updated",
      "session.closed",
      "context.injected",
      "artifact.exported",
    ];

    for (const event of events) {
      if (!validEvents.includes(event)) {
        res.status(400).json({ error: "bad_request", message: `Invalid event type: ${event}` });
        return;
      }
    }

    const id = uuidv4();
    const registration: WebhookRegistration = {
      id,
      endpoint_url,
      events,
      secret_token,
      retry_policy: {
        max_attempts: retry_policy?.max_attempts ?? 5,
        initial_delay_ms: retry_policy?.initial_delay_ms ?? 500,
      },
      created_at: new Date().toISOString(),
    };

    webhooksStore.push(registration);

    res.status(200).json({
      webhook_id: id,
      status: "registered",
      created_at: registration.created_at,
    });
  }
);

/**
 * 3. Artifact Export Endpoint (§4.4)
 */
McpRouter.post(
  "/artifacts/export",
  mockAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).userContext;
    const { notebook_id, target_space_id, format, include_metadata } = req.body as ArtifactExportRequest;

    // Rate Limit enforcement
    const limiter = getLimiter(user.tenant_id, "export", user.tier);
    res.setHeader("X-RateLimit-Limit", limiter.getLimit().toString());
    res.setHeader("X-RateLimit-Remaining", limiter.getRemaining().toString());
    res.setHeader("X-RateLimit-Reset", limiter.getResetSeconds().toString());

    if (!limiter.take()) {
      res.status(429).json({ error: "rate_limit_exceeded", message: "Too many export requests." });
      return;
    }

    if (!notebook_id || !target_space_id || !format) {
      res.status(400).json({ error: "bad_request", message: "Missing required fields: notebook_id, target_space_id, format" });
      return;
    }

    if (!validateUuid(notebook_id) || !validateUuid(target_space_id)) {
      res.status(400).json({ error: "bad_request", message: "notebook_id and target_space_id must be valid UUIDs" });
      return;
    }

    if (format !== "pdf" && format !== "markdown" && format !== "json") {
      res.status(400).json({ error: "bad_request", message: "Format must be pdf, markdown, or json" });
      return;
    }

    // Role verification: Editor can only export own space, Tenant Admin can do all
    if (user.notebook_role === "Editor" && !user.allowed_spaces.includes(target_space_id)) {
      res.status(403).json({ error: "forbidden", message: "Editor cannot export to unauthorized space" });
      return;
    }

    const export_job_id = uuidv4();
    const job: ArtifactExportJob = {
      export_job_id,
      notebook_id,
      target_space_id,
      format,
      include_metadata: include_metadata ?? false,
      status: "queued",
      estimated_completion_seconds: 5,
      created_at: new Date().toISOString(),
    };

    exportJobsStore[export_job_id] = job;

    // Simulate async processing
    processAsyncExport(job, user.tenant_id, user.user_id);

    const response: ArtifactExportResponse = {
      export_job_id,
      status: "queued",
      estimated_completion_seconds: 5,
    };

    res.status(202).json(response);
  }
);

/**
 * 4. Artifact Export Status Endpoint (§4.4 Note)
 */
McpRouter.get(
  "/artifacts/export/:export_job_id",
  mockAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { export_job_id } = req.params;
    const job = exportJobsStore[export_job_id];

    if (!job) {
      res.status(404).json({ error: "not_found", message: "Export job not found" });
      return;
    }

    res.status(200).json(job);
  }
);

// ============================================================================
// WEBHOOK DELIVERER AND SIGNATURE SIGNER (§4.3)
// ============================================================================

export function computeWebhookSignature(body: string, secretToken: string): string {
  const hmac = crypto.createHmac("sha256", secretToken);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

async function dispatchWebhookEvent(event: EventEnvelope): Promise<void> {
  const subscriptions = webhooksStore.filter((webhook) =>
    webhook.events.includes(event.event_type as WebhookEvent)
  );

  const payloadStr = JSON.stringify(event);

  for (const sub of subscriptions) {
    const signature = computeWebhookSignature(payloadStr, sub.secret_token);
    processWebhookDelivery(sub, event, signature);
  }
}

export const webhookDeliveriesLog: Array<{
  url: string;
  event_type: string;
  signature: string;
  payload: EventEnvelope;
  timestamp: string;
}> = [];

async function processWebhookDelivery(
  sub: WebhookRegistration,
  event: EventEnvelope,
  signature: string
): Promise<void> {
  webhookDeliveriesLog.push({
    url: sub.endpoint_url,
    event_type: event.event_type,
    signature,
    payload: event,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// ASYNC JOB PROCESSOR (MOCK)
// ============================================================================

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function processAsyncExport(job: ArtifactExportJob, tenantId: string, userId: string): Promise<void> {
  await sleep(10);

  job.status = "processing";
  job.estimated_completion_seconds = 2;

  await sleep(20);

  job.status = "completed";
  job.estimated_completion_seconds = 0;
  job.completed_at = new Date().toISOString();
  job.download_url = `https://mcp-gateway.example.com/downloads/${job.export_job_id}.${job.format}`;
  job.artifact_size_bytes = 1024 * 35; // 35 KB

  const event: EventEnvelope = {
    event_id: uuidv4(),
    event_type: "artifact.exported",
    source: "notebooklm",
    tenant_id: tenantId,
    user_id: userId,
    timestamp_utc: new Date().toISOString(),
    schema_version: "2.0.0",
    payload: {
      export_job_id: job.export_job_id,
      notebook_id: job.notebook_id,
      target_space_id: job.target_space_id,
      format: job.format,
      download_url: job.download_url,
    },
  };

  await dispatchWebhookEvent(event);
}

// Reset webhooks and export jobs (for test sanitization)
export function resetMcpGatewayStores(): void {
  webhooksStore.length = 0;
  webhookDeliveriesLog.length = 0;
  for (const key of Object.keys(exportJobsStore)) {
    delete exportJobsStore[key];
  }
  for (const key of Object.keys(idempotencyStore)) {
    delete idempotencyStore[key];
  }
  for (const key of Object.keys(sessionBindingsStore)) {
    delete sessionBindingsStore[key];
  }
  activeInjections.clear();
  setDownstreamFailureRate(0);
}

/**
 * Helper to register a mock session binding directly in tests.
 */
export function registerMockSessionBinding(sessionId: string, userId: string, tenantId: string): void {
  sessionBindingsStore[sessionId] = { user_id: userId, tenant_id: tenantId };
}
