import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  McpRouter,
  resetMcpGatewayStores,
  resetRateLimiters,
  setDownstreamFailureRate,
  computeWebhookSignature,
  webhookDeliveriesLog,
  registerMockSessionBinding,
} from "../context-service/mcp/McpRouter.js";
import { PIIRedactionService } from "../context-service/mcp/PIIRedactionService.js";
import { AuditLogger } from "../context-service/mcp/AuditLogger.js";
import { contextEngineCircuitBreaker, mcpDLQService } from "../context-service/mcp/ResilienceService.js";
import { v4 as uuidv4 } from "uuid";

describe("CoWork MCP Integration Gateway Specification v1.2", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/v1/mcp", McpRouter);
    resetMcpGatewayStores();
    resetRateLimiters();
    contextEngineCircuitBreaker.reset();
    mcpDLQService.clear();
    AuditLogger.clear();
  });

  afterEach(() => {
    resetMcpGatewayStores();
    resetRateLimiters();
    contextEngineCircuitBreaker.reset();
    mcpDLQService.clear();
    AuditLogger.clear();
  });

  describe("API Authentication, Permissions and Claim Mapping (§6.1, §6.2, §6.3)", () => {
    it("should accept valid requests and map claims", async () => {
      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc_name: "Spec v1.2" },
        },
        idempotency_key: uuidv4(),
      };

      const res = await request(app)
        .post("/v1/mcp/context/inject")
        .set("Authorization", "Bearer test-token")
        .set("x-tenant-id", "tenant-abc")
        .set("x-user-id", "user-xyz")
        .set("x-cowork-role", "Editor")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.injection_id).toBeDefined();
      expect(res.body.status).toBe("accepted");
    });

    it("should deny context injection to Viewer role (§6.2)", async () => {
      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc_name: "Spec v1.2" },
        },
        idempotency_key: uuidv4(),
      };

      const res = await request(app)
        .post("/v1/mcp/context/inject")
        .set("x-cowork-role", "Viewer")
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it("should validate sub <-> user_id match in session bindings and prevent cross-session attacks (§6.3)", async () => {
      const sessionId = uuidv4();
      
      // Bind session to user-123
      registerMockSessionBinding(sessionId, "user-123", "tenant-abc");

      const payload = {
        session_id: sessionId,
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { sensitive_data: "confidential" },
        },
        idempotency_key: uuidv4(),
      };

      // Request from user-999 should be rejected
      const resRejected = await request(app)
        .post("/v1/mcp/context/inject")
        .set("x-user-id", "user-999")
        .send(payload);

      expect(resRejected.status).toBe(403);
      expect(resRejected.body.message).toContain("Session binding mismatch");

      // Request from user-123 should be allowed
      const resAllowed = await request(app)
        .post("/v1/mcp/context/inject")
        .set("x-user-id", "user-123")
        .send(payload);

      expect(resAllowed.status).toBe(200);
    });
  });

  describe("PII Redaction Engine and Audit Logging (§8)", () => {
    it("should redact email, phone, SSN, and credit card numbers", () => {
      const rawText = "Contact John at john.doe@example.com or +1 (555) 019-2834. SSN: 000-12-3456. Pay with card 4111 1111 1111 1111.";
      const redacted = PIIRedactionService.redactText(rawText, "full");
      
      expect(redacted).toContain("[EMAIL REDACTED]");
      expect(redacted).toContain("[PHONE REDACTED]");
      expect(redacted).toContain("[SSN REDACTED]");
      expect(redacted).toContain("[PAYMENT REDACTED]");
    });

    it("should check Luhn algorithm and not redact invalid credit cards", () => {
      const rawText = "This card number is fake: 1234 5678 1234 5678.";
      const redacted = PIIRedactionService.redactText(rawText, "full");
      
      expect(redacted).not.toContain("[PAYMENT REDACTED]");
      expect(redacted).toContain("1234 5678 1234 5678");
    });

    it("should perform heuristic Name and Address redaction in full mode", () => {
      const rawText = "Mr. John Smith lives at 123 Main Street and has zip code NY 10001.";
      const redacted = PIIRedactionService.redactText(rawText, "full");

      expect(redacted).toContain("[NAME REDACTED]");
      expect(redacted).toContain("[ADDRESS REDACTED]");
    });

    it("should respect regex_only bypass scan mode for names/addresses", () => {
      const rawText = "Mr. John Smith lives at 123 Main Street. Email is john@test.com.";
      const redacted = PIIRedactionService.redactText(rawText, "regex_only");

      expect(redacted).toContain("[EMAIL REDACTED]");
      expect(redacted).toContain("John Smith");
      expect(redacted).toContain("123 Main Street");
    });

    it("should record redaction events in the Audit Log (§8)", () => {
      const rawText = "Email john@test.com. SSN: 000-00-0000. Name: John Smith.";
      
      PIIRedactionService.redactText(rawText, "full");

      const logs = AuditLogger.getHistory();
      
      expect(logs.length).toBeGreaterThanOrEqual(3);
      
      const events = logs.map(l => l.event);
      const categories = logs.map(l => l.category);

      expect(events).toContain("pii_redacted");
      expect(categories).toContain("email");
      expect(categories).toContain("ssn");
      expect(categories).toContain("name");
    });
  });

  describe("Context Injection and Idempotency (§4.2)", () => {
    it("should validate input schema and reject missing fields with 400 bad_request", async () => {
      const res = await request(app)
        .post("/v1/mcp/context/inject")
        .send({ session_id: "not-a-uuid" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("bad_request");
    });

    it("should validate business logic and return 422 unprocessable_entity for unknown session_id", async () => {
      const payload = {
        session_id: "00000000-0000-0000-0000-000000000000",
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc: "unknown session" },
        },
        idempotency_key: uuidv4(),
      };

      const res = await request(app)
        .post("/v1/mcp/context/inject")
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("unprocessable_entity");
    });

    it("should return cached response on duplicate idempotency key", async () => {
      const idempotencyKey = uuidv4();
      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc_name: "Unique Session Doc" },
        },
        idempotency_key: idempotencyKey,
      };

      const res1 = await request(app)
        .post("/v1/mcp/context/inject")
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe("accepted");
      const firstId = res1.body.injection_id;

      const res2 = await request(app)
        .post("/v1/mcp/context/inject")
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe("deduplicated");
      expect(res2.body.injection_id).toBe(firstId);
    });

    it("should return 409 conflict on concurrent modifications to the same session (§4.2)", async () => {
      const sessionId = uuidv4();
      const payload1 = {
        session_id: sessionId,
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { update: "first concurrent write" },
        },
        idempotency_key: uuidv4(),
      };

      const payload2 = {
        session_id: sessionId,
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { update: "second concurrent write" },
        },
        idempotency_key: uuidv4(),
      };

      // Fire both concurrently
      const [res1, res2] = await Promise.all([
        request(app).post("/v1/mcp/context/inject").send(payload1),
        request(app).post("/v1/mcp/context/inject").send(payload2),
      ]);

      // One should succeed (200) and the other should fail with a conflict (409)
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error).toBe("conflict");
    });
  });

  describe("Webhook Registration and Signature Signoff (§4.3)", () => {
    it("should register HTTPS webhook urls and reject HTTP urls", async () => {
      const payloadHTTP = {
        endpoint_url: "http://webhook.example.com/callback",
        events: ["context.injected"],
        secret_token: "a".repeat(32),
      };

      const resHTTP = await request(app)
        .post("/v1/mcp/webhooks")
        .send(payloadHTTP);

      expect(resHTTP.status).toBe(400);

      const payloadHTTPS = {
        endpoint_url: "https://webhook.example.com/callback",
        events: ["context.injected"],
        secret_token: "a".repeat(32),
      };

      const resHTTPS = await request(app)
        .post("/v1/mcp/webhooks")
        .send(payloadHTTPS);

      expect(resHTTPS.status).toBe(200);
      expect(resHTTPS.body.webhook_id).toBeDefined();
    });

    it("should sign and deliver webhook payloads with HMAC-SHA256 signature", async () => {
      const secretToken = "my-secret-key-must-be-very-long-32-chars-long";
      
      await request(app)
        .post("/v1/mcp/webhooks")
        .send({
          endpoint_url: "https://my-receiver.com/mcp-events",
          events: ["context.injected"],
          secret_token: secretToken,
        });

      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { change: "new collaborator joined" },
        },
        idempotency_key: uuidv4(),
      };

      await request(app)
        .post("/v1/mcp/context/inject")
        .send(payload);

      expect(webhookDeliveriesLog.length).toBe(1);
      const delivery = webhookDeliveriesLog[0];
      expect(delivery.url).toBe("https://my-receiver.com/mcp-events");
      expect(delivery.event_type).toBe("context.injected");

      const expectedSignature = computeWebhookSignature(JSON.stringify(delivery.payload), secretToken);
      expect(delivery.signature).toBe(expectedSignature);
    });
  });

  describe("Rate Limiting and Headers (§4.5)", () => {
    it("should return rate limit headers on successful and throttled requests", async () => {
      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc_name: "Header Verification" },
        },
        idempotency_key: uuidv4(),
      };

      const res = await request(app)
        .post("/v1/mcp/context/inject")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers["x-ratelimit-limit"]).toBeDefined();
      expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(res.headers["x-ratelimit-reset"]).toBeDefined();
    });

    it("should enforce standard rate limit tier and return 429", async () => {
      const payload = {
        session_id: uuidv4(),
        workspace_id: uuidv4(),
        context_payload: {
          type: "workspace_state",
          content: { doc_name: "Rapid Injections" },
        },
        idempotency_key: uuidv4(),
      };

      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post("/v1/mcp/context/inject")
          .set("x-tenant-id", "tenant-standard")
          .set("x-tenant-tier", "Standard")
          .send({ ...payload, idempotency_key: uuidv4() });
        expect(res.status).toBe(200);
      }

      const res429 = await request(app)
        .post("/v1/mcp/context/inject")
        .set("x-tenant-id", "tenant-standard")
        .set("x-tenant-tier", "Standard")
        .send({ ...payload, idempotency_key: uuidv4() });

      expect(res429.status).toBe(429);
      expect(res429.headers["retry-after"]).toBe("60");
      expect(res429.headers["x-ratelimit-remaining"]).toBe("0");
    });
  });

  describe("Error Handling, Resilience and rolling window (§7)", () => {
    it("should trip circuit breaker in 60s rolling window and route failures to DLQ", async () => {
      setDownstreamFailureRate(1.0);

      // Trigger 10 failures (minimum requests for trip)
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post("/v1/mcp/context/inject")
          .send({
            session_id: uuidv4(),
            workspace_id: uuidv4(),
            context_payload: {
              type: "workspace_state",
              content: { attempt: i },
            },
            idempotency_key: uuidv4(),
          });
        expect(res.status).toBe(500);
      }

      expect(contextEngineCircuitBreaker.getState()).toBe("OPEN");

      const res503 = await request(app)
        .post("/v1/mcp/context/inject")
        .send({
          session_id: uuidv4(),
          workspace_id: uuidv4(),
          context_payload: {
            type: "workspace_state",
            content: { attempt: 11 },
          },
          idempotency_key: uuidv4(),
        });

      expect(res503.status).toBe(503);
      expect(res503.headers["x-mcp-circuit"]).toBe("open");

      const dlqList = mcpDLQService.list();
      expect(dlqList.length).toBe(10);
    });
  });

  describe("Artifact Export API (§4.4)", () => {
    it("should accept export job asynchronously and track state", async () => {
      const res = await request(app)
        .post("/v1/mcp/artifacts/export")
        .set("x-cowork-role", "Tenant Admin")
        .send({
          notebook_id: uuidv4(),
          target_space_id: uuidv4(),
          format: "pdf",
          include_metadata: true,
        });

      expect(res.status).toBe(202);
      expect(res.body.export_job_id).toBeDefined();
      const jobId = res.body.export_job_id;

      const statusRes = await request(app)
        .get(`/v1/mcp/artifacts/export/${jobId}`)
        .set("x-cowork-role", "Tenant Admin");

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.export_job_id).toBe(jobId);
    });
  });

  describe("Performance and SLA validation (§9)", () => {
    it("should satisfy p95 latency SLA target of <= 200ms", async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 20; i++) {
        const payload = {
          session_id: uuidv4(),
          workspace_id: uuidv4(),
          context_payload: {
            type: "workspace_state",
            content: { benchmark: i },
          },
          idempotency_key: uuidv4(),
        };

        const res = await request(app)
          .post("/v1/mcp/context/inject")
          .send(payload);

        expect(res.status).toBe(200);
        latencies.push(res.body.latency_ms);
      }

      // Compute p95
      latencies.sort((a, b) => a - b);
      const p95Idx = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Idx];

      console.log(`[PERFORMANCE BENCHMARK] p95 Latency: ${p95Latency}ms`);
      expect(p95Latency).toBeLessThanOrEqual(200);
    });
  });
});
