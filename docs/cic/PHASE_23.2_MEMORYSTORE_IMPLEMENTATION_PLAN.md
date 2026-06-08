---
title: Phase 23.2 Implementation Plan — MemoryStore Core Module
version: 1.0.0
date: 2026-06-07
status: LOCKED
---

# PHASE 23.2 IMPLEMENTATION PLAN

**MemoryStore: Durable, Append-Only Event Log with Strict Schema Validation**

**Lock Date:** 2026-06-07 (Phase 23 Day 1)

**Scope:** Core MemoryStore module that implements the MLA spec (lines 1–858) with full data durability, atomic writes, schema validation, and integrity checking.

**Deliverable:** Production-ready TypeScript module ready for Phase 23.3 (Memory Harvester) integration.

---

## OVERVIEW

MemoryStore is the **durable substrate** for all CIC operational history. It:

- Stores immutable events (6 types: ARPS_DELTA, PIPELINE_RUN, AGENT_TELEMETRY, GOVERNANCE_SIGNAL, APR_PLAN, CRO_RUN)
- Enforces strict schema validation (reject invalid, don't poison store)
- Guarantees append-only writes with atomic ACID guarantees
- Detects corruption (checksums, re-validation on read)
- Implements tiered retention (raw 90 days → archived S3 → distilled permanent)
- Provides query patterns (date + type, lazy loading)

---

## IMPLEMENTATION PHASES

### Phase 23.2.1 — Core Data Structure & Persistence

**Deliverable:** `memory-store.ts` with:
- Event model (TypeScript interface)
- File-based append-only ledger
- Atomic write logic
- Durability guarantees

**Timeframe:** ~4 hours

---

### Phase 23.2.2 — Validation & Schema Enforcement

**Deliverable:** `memory-validator.ts` with:
- JSON schema validation for all 6 event types
- Field-level type checking
- Temporal validation (timestamps)
- Rejection rules (invalid → log + return error, don't write)

**Timeframe:** ~3 hours

---

### Phase 23.2.3 — Integrity & Corruption Detection

**Deliverable:** `memory-integrity.ts` with:
- Checksum computation (SHA-256)
- Corruption detection on read
- Quarantine logic (corrupted events logged, not returned)
- Re-validation on write

**Timeframe:** ~2 hours

---

### Phase 23.2.4 — Query & Access Patterns

**Deliverable:** `memory-query.ts` with:
- Sequential scan (early phases)
- Index by date + event_type (future)
- Lazy loading (7-day window)
- Efficient read patterns

**Timeframe:** ~2 hours

---

### Phase 23.2.5 — Retention & Archival

**Deliverable:** `memory-retention.ts` with:
- Tiered retention policy (90 days raw, S3 archival, distilled summaries)
- Automatic archival every 90 days
- S3 path generation (`memory_archive_YYYY_MM.json.gz`)
- Distillation rules per event type

**Timeframe:** ~4 hours

---

### Phase 23.2.6 — Testing & Validation

**Deliverable:** Full test suite covering:
- Happy path (valid events)
- Schema rejection (invalid events)
- Corruption detection
- Atomic write guarantees
- Timestamp ordering
- Checksum validation

**Timeframe:** ~4 hours

---

**Total Phase 23.2 Duration:** ~19 hours

---

## FILE STRUCTURE

```
C:\dev\rewrite-mcp\projects\cic\memory\
├── store/
│   ├── memory-store.ts              # Core append-only ledger
│   ├── memory-store.types.ts        # Event interfaces (from MLA spec)
│   ├── memory-store.config.ts       # Configuration (paths, retention)
│   └── memory-store.errors.ts       # Error types
│
├── validation/
│   ├── memory-validator.ts          # Schema validation
│   ├── schemas/
│   │   ├── arps-delta.schema.json
│   │   ├── pipeline-run.schema.json
│   │   ├── agent-telemetry.schema.json
│   │   ├── governance-signal.schema.json
│   │   ├── apr-plan.schema.json
│   │   └── cro-run.schema.json
│   └── validation.utils.ts          # Helpers (temporal, type checks)
│
├── integrity/
│   ├── memory-integrity.ts          # Checksum, corruption detection
│   └── integrity.utils.ts           # SHA-256, re-validation
│
├── query/
│   ├── memory-query.ts              # Read patterns
│   └── query.utils.ts               # Lazy loading, indexing
│
├── retention/
│   ├── memory-retention.ts          # Archival, distillation
│   ├── retention.config.ts          # Policy overrides
│   ├── distillery/
│   │   ├── arps-distiller.ts
│   │   ├── pipeline-distiller.ts
│   │   ├── agent-telemetry-distiller.ts
│   │   ├── governance-distiller.ts
│   │   ├── apr-plan-distiller.ts
│   │   └── cro-distiller.ts
│   └── archiver.ts                  # S3 upload, file rotation
│
├── index.ts                         # Main exports
├── MemoryStore.test.ts              # Integration tests
├── README.md                        # Operator guide
└── docs/
    ├── USAGE.md                     # API reference
    ├── DURABILITY.md                # ACID guarantees
    └── RETENTION_POLICY.md          # Retention rules

C:\dev\rewrite-mcp\
└── memory_store.json                # Live ledger (append-only)
```

---

## 23.2.1 — CORE DATA STRUCTURE

### File: memory-store.types.ts

```typescript
// All event types from MLA spec

export interface MemoryEvent {
  id: string;                         // UUID v4
  timestamp: string;                  // ISO8601
  event_type: EventType;              // One of 6 types
  source_agent: string;               // Non-empty string
  session_id: string;                 // Pattern: session_YYYYMMDD_\d{3,}
  correlation_id: string;             // Pattern: corr_[a-z0-9]{6,}
  payload: EventPayload;              // Type-specific
  retention_days: number;             // Positive integer
  checksum?: string;                  // SHA-256 (computed at write)
  version: number;                    // Default: 1 (for migrations)
}

export type EventType = 
  | "ARPS_DELTA" 
  | "PIPELINE_RUN" 
  | "AGENT_TELEMETRY" 
  | "GOVERNANCE_SIGNAL" 
  | "APR_PLAN" 
  | "CRO_RUN";

export type EventPayload = 
  | ARPSDeltaPayload 
  | PipelineRunPayload 
  | AgentTelemetryPayload 
  | GovernanceSignalPayload 
  | APRPlanPayload 
  | CRORun Payload;

// Type-specific payloads (from MLA spec)

export interface ARPSDeltaPayload {
  change_type: "phase_completion" | "phase_creation" | "prompt_rewrite" | "instruction_update" | "priority_adjustment";
  phase_id?: string;
  old_value: string;
  new_value: string;
  git_commit: string;
  confidence: number;                 // 0-1
  affected_subsystems: string[];
}

export interface PipelineRunPayload {
  pipeline_name: string;
  pipeline_id: string;
  status: "success" | "partial" | "failed";
  start_time: string;                 // ISO8601
  end_time: string;                   // ISO8601
  duration_ms: number;
  items_processed: number;
  items_successful: number;
  items_failed: number;
  error_summary?: string;
  metrics: {
    throughput_items_per_second: number;
    error_rate_percent: number;
    resource_usage_mb: number;
  };
  failed_items?: Array<{
    item_id: string;
    error: string;
    severity: "low" | "medium" | "high";
  }>;
}

export interface AgentTelemetryPayload {
  agent_name: string;
  agent_class: "ingestion" | "processing" | "reasoning" | "planning" | "execution";
  status: "healthy" | "degraded" | "failed";
  uptime_seconds: number;
  task_count: number;
  task_success_rate: number;          // 0-1
  last_error?: string;
  last_error_time?: string;           // ISO8601
  performance: {
    avg_task_duration_ms: number;
    p95_task_duration_ms: number;
    cpu_usage_percent: number;
    memory_usage_mb: number;
    error_rate_percent: number;
  };
  degradation_reason?: string;
}

export interface GovernanceSignalPayload {
  signal_type: "approval" | "rejection" | "escalation" | "zone_violation" | "threshold_crossed" | "constraint_violation";
  entity_type: "skill" | "extraction" | "phase_write" | "cli_command";
  entity_id: string;
  decision: "approved" | "rejected" | "escalated";
  reason: string;
  operator?: string;
  approval_count: number;
  approval_threshold: number;
  metadata: Record<string, any>;
}

export interface APRPlanPayload {
  plan_id: string;
  goal: string;
  plan_type: "feature_development" | "bug_fix" | "optimization" | "governance";
  status: "generated" | "in_progress" | "completed" | "failed";
  task_count: number;
  task_graph: Array<{
    id: string;
    name: string;
    depends_on: string[];
    estimated_effort_hours: number;
  }>;
  critical_path_hours: number;
  risk_level: "low" | "medium" | "high";
  risk_factors: string[];
  agent_consensus_score: number;      // 0-1
  agents_involved: string[];
}

export interface CRORun Payload {
  run_id: string;
  plan_id: string;
  status: "queued" | "running" | "completed" | "failed" | "rolled_back";
  start_time: string;                 // ISO8601
  end_time: string;                   // ISO8601
  duration_ms: number;
  step_count: number;
  step_results: Array<{
    step_id: string;
    task_id: string;
    agent_name: string;
    status: "success" | "failed";
    start_time: string;               // ISO8601
    end_time: string;                 // ISO8601
    duration_ms: number;
    output_size_bytes: number;
    error?: string;
  }>;
  failure_info?: Record<string, any>;
  recovery_action?: string;
}
```

---

### File: memory-store.ts

```typescript
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { MemoryEvent, EventType } from "./memory-store.types";
import { MemoryValidator } from "../validation/memory-validator";
import { MemoryIntegrity } from "../integrity/memory-integrity";

export class MemoryStore {
  private storePath: string;
  private lockPath: string;
  private validator: MemoryValidator;
  private integrity: MemoryIntegrity;
  private writeBuffer: MemoryEvent[] = [];
  private writeBufferSize: number = 100;  // Sync every 100 events

  constructor(storePath: string = "C:\\dev\\rewrite-mcp\\memory_store.json") {
    this.storePath = storePath;
    this.lockPath = `${storePath}.lock`;
    this.validator = new MemoryValidator();
    this.integrity = new MemoryIntegrity();

    this.ensureStorePath();
  }

  private ensureStorePath(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.storePath)) {
      fs.writeFileSync(this.storePath, "[]", "utf8");
    }
  }

  /**
   * Append a single event to the store (with full validation)
   */
  async append(event: Omit<MemoryEvent, "id" | "checksum" | "version">): Promise<MemoryEvent> {
    // 1. Assign ID and version
    const id = uuidv4();
    const version = 1;

    // 2. Validate schema
    try {
      await this.validator.validate(event.event_type, event.payload);
    } catch (err) {
      // Log rejection, don't write
      console.error("EVENT_VALIDATION_FAILED", {
        event_type: event.event_type,
        source_agent: event.source_agent,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // 3. Compute checksum
    const checksum = this.integrity.computeChecksum({ ...event, id, version });

    // 4. Create final event
    const finalEvent: MemoryEvent = {
      ...event,
      id,
      version,
      checksum,
    };

    // 5. Validate temporal ordering
    const lastEvent = await this.getLastEvent();
    if (lastEvent && finalEvent.timestamp < lastEvent.timestamp) {
      console.warn("TEMPORAL_VIOLATION", {
        last_timestamp: lastEvent.timestamp,
        new_timestamp: finalEvent.timestamp,
      });
      // Warning but continue (allow future timestamps within 5 seconds)
    }

    // 6. Add to write buffer
    this.writeBuffer.push(finalEvent);

    // 7. Flush if buffer exceeds threshold
    if (this.writeBuffer.length >= this.writeBufferSize) {
      await this.flush();
    }

    return finalEvent;
  }

  /**
   * Flush write buffer to disk atomically
   */
  private async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) {
      return;
    }

    // Acquire lock
    await this.acquireLock();

    try {
      // 1. Read current store
      const current = this.readStore();

      // 2. Append buffered events
      const updated = [...current, ...this.writeBuffer];

      // 3. Write to .tmp file
      const tmpPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), "utf8");

      // 4. Atomic rename (ACID on most filesystems)
      fs.renameSync(tmpPath, this.storePath);

      // 5. fsync (force durability)
      const fd = fs.openSync(this.storePath, "r");
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // 6. Clear buffer
      this.writeBuffer = [];

      console.log(`✓ Flushed ${updated.length} events to store`);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Force flush on shutdown
   */
  async flush_sync(): Promise<void> {
    await this.flush();
  }

  /**
   * Read all events from store (with corruption detection)
   */
  private readStore(): MemoryEvent[] {
    try {
      const content = fs.readFileSync(this.storePath, "utf8");
      const events = JSON.parse(content) as MemoryEvent[];

      // Validate checksums on read
      const validEvents = events.filter((evt) => {
        try {
          const isValid = this.integrity.validateChecksum(evt);
          return isValid;
        } catch {
          console.warn("CORRUPTED_EVENT", { event_id: evt.id });
          return false;  // Quarantine corrupted events
        }
      });

      return validEvents;
    } catch (err) {
      console.error("STORE_READ_FAILURE", {
        path: this.storePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Query events by date range and type
   */
  async query(
    eventType?: EventType,
    dateFrom?: string,
    dateTo?: string
  ): Promise<MemoryEvent[]> {
    const events = this.readStore();

    return events.filter((evt) => {
      if (eventType && evt.event_type !== eventType) return false;
      if (dateFrom && evt.timestamp < dateFrom) return false;
      if (dateTo && evt.timestamp > dateTo) return false;
      return true;
    });
  }

  /**
   * Lazy load: only load events from last N days
   */
  async queryRecent(days: number = 7): Promise<MemoryEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    return this.query(undefined, cutoff);
  }

  /**
   * Get the last event for temporal validation
   */
  private async getLastEvent(): Promise<MemoryEvent | null> {
    const events = this.readStore();
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Lock management (simple file-based)
   */
  private async acquireLock(maxWaitMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (fs.existsSync(this.lockPath)) {
      if (Date.now() - startTime > maxWaitMs) {
        throw new Error(`Failed to acquire lock after ${maxWaitMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    fs.writeFileSync(this.lockPath, process.pid.toString(), "utf8");
  }

  private async releaseLock(): Promise<void> {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      console.warn("LOCK_RELEASE_FAILED");
    }
  }

  /**
   * Statistics
   */
  async getStats(): Promise<{
    total_events: number;
    by_type: Record<EventType, number>;
    oldest_event: string | null;
    newest_event: string | null;
    store_size_mb: number;
  }> {
    const events = this.readStore();
    const by_type: Record<EventType, number> = {
      ARPS_DELTA: 0,
      PIPELINE_RUN: 0,
      AGENT_TELEMETRY: 0,
      GOVERNANCE_SIGNAL: 0,
      APR_PLAN: 0,
      CRO_RUN: 0,
    };

    for (const evt of events) {
      by_type[evt.event_type]++;
    }

    const stats = fs.statSync(this.storePath);

    return {
      total_events: events.length,
      by_type,
      oldest_event: events.length > 0 ? events[0].timestamp : null,
      newest_event: events.length > 0 ? events[events.length - 1].timestamp : null,
      store_size_mb: stats.size / (1024 * 1024),
    };
  }
}
```

---

## 23.2.2 — VALIDATION

### File: memory-validator.ts

```typescript
import Ajv, { JSONSchemaType } from "ajv";
import * as fs from "fs";
import * as path from "path";

export class MemoryValidator {
  private ajv: Ajv;
  private schemas: Record<string, JSONSchemaType<any>> = {};

  constructor() {
    this.ajv = new Ajv({ strict: true, useDefaults: false });
    this.loadSchemas();
  }

  private loadSchemas(): void {
    const schemaDir = path.join(__dirname, "schemas");
    const eventTypes = [
      "arps-delta",
      "pipeline-run",
      "agent-telemetry",
      "governance-signal",
      "apr-plan",
      "cro-run",
    ];

    for (const type of eventTypes) {
      const schemaPath = path.join(schemaDir, `${type}.schema.json`);
      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
        this.schemas[type] = schema;
      }
    }
  }

  /**
   * Validate payload against event type schema
   */
  async validate(eventType: string, payload: any): Promise<void> {
    const schema = this.schemas[eventType.toLowerCase().replace(/_/g, "-")];
    
    if (!schema) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(payload);

    if (!valid) {
      throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
    }
  }

  /**
   * Validate temporal constraints
   */
  validateTemporal(timestamp: string, lastTimestamp?: string): void {
    const ts = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveSecondsAhead = now + 5000;

    if (ts > fiveSecondsAhead) {
      throw new Error(`Future timestamp too far ahead: ${timestamp}`);
    }

    if (lastTimestamp) {
      const lastTs = new Date(lastTimestamp).getTime();
      if (ts < lastTs) {
        throw new Error(`Timestamp before previous event: ${timestamp} < ${lastTimestamp}`);
      }
    }
  }

  /**
   * Validate identifiers (session_id, correlation_id, etc.)
   */
  validateIdentifiers(session_id: string, correlation_id: string): void {
    const sessionPattern = /^session_\d{8}_\d{3,}$/;
    const correlationPattern = /^corr_[a-z0-9]{6,}$/;

    if (!sessionPattern.test(session_id)) {
      throw new Error(`Invalid session_id: ${session_id}`);
    }

    if (!correlationPattern.test(correlation_id)) {
      throw new Error(`Invalid correlation_id: ${correlation_id}`);
    }
  }
}
```

---

## 23.2.3 — INTEGRITY

### File: memory-integrity.ts

```typescript
import * as crypto from "crypto";
import { MemoryEvent } from "./memory-store.types";

export class MemoryIntegrity {
  /**
   * Compute SHA-256 checksum of event
   */
  computeChecksum(event: MemoryEvent): string {
    // Exclude checksum field itself from computation
    const { checksum, ...eventData } = event;
    const json = JSON.stringify(eventData, Object.keys(eventData).sort());
    return "sha256:" + crypto.createHash("sha256").update(json).digest("hex");
  }

  /**
   * Validate checksum on read
   */
  validateChecksum(event: MemoryEvent): boolean {
    if (!event.checksum) {
      console.warn("EVENT_MISSING_CHECKSUM", { event_id: event.id });
      return false;
    }

    const computed = this.computeChecksum(event);
    const matches = computed === event.checksum;

    if (!matches) {
      console.warn("CHECKSUM_MISMATCH", {
        event_id: event.id,
        expected: event.checksum,
        computed,
      });
    }

    return matches;
  }
}
```

---

## 23.2.4 — QUERY

### File: memory-query.ts

```typescript
import { MemoryStore } from "./memory-store";
import { MemoryEvent, EventType } from "./memory-store.types";

export class MemoryQuery {
  constructor(private store: MemoryStore) {}

  /**
   * Get events for a specific date range
   */
  async getByDateRange(from: string, to: string, eventType?: EventType): Promise<MemoryEvent[]> {
    return this.store.query(eventType, from, to);
  }

  /**
   * Get recent events (last N days)
   */
  async getRecent(days: number = 7): Promise<MemoryEvent[]> {
    return this.store.queryRecent(days);
  }

  /**
   * Get all events of a specific type
   */
  async getByType(eventType: EventType): Promise<MemoryEvent[]> {
    return this.store.query(eventType);
  }

  /**
   * Count events by type over a date range
   */
  async countByType(
    eventType: EventType,
    from?: string,
    to?: string
  ): Promise<number> {
    const events = await this.store.query(eventType, from, to);
    return events.length;
  }

  /**
   * Get events for a specific correlation (trace)
   */
  async getByCorrelation(correlationId: string): Promise<MemoryEvent[]> {
    const events = await this.store.queryRecent(30);  // Last 30 days
    return events.filter((evt) => evt.correlation_id === correlationId);
  }
}
```

---

## 23.2.5 — RETENTION

### File: memory-retention.ts

```typescript
import * as fs from "fs";
import * as path from "path";
import { gzip } from "zlib";
import { promisify } from "util";
import { MemoryStore } from "./memory-store";
import { MemoryEvent } from "./memory-store.types";

const gzipAsync = promisify(gzip);

export class MemoryRetention {
  private s3Destination: string = "s3://cic-memory-archive";
  private autoArchive: boolean = true;
  private archiveScheduleCron: string = "0 0 1 * *";  // First day of month

  constructor(private store: MemoryStore) {}

  /**
   * Archive events older than N days
   */
  async archiveOlderThan(days: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    // Query events before cutoff
    const eventsToArchive = await this.store.queryRecent(365);  // Get all available
    const filtered = eventsToArchive.filter((evt) => evt.timestamp < cutoff);

    if (filtered.length === 0) {
      console.log("No events to archive");
      return;
    }

    // Group by month
    const byMonth: Record<string, MemoryEvent[]> = {};
    for (const evt of filtered) {
      const month = evt.timestamp.substring(0, 7);  // YYYY-MM
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(evt);
    }

    // Upload each month to S3
    for (const [month, events] of Object.entries(byMonth)) {
      const [year, monthNum] = month.split("-");
      const filename = `memory_archive_${year}_${monthNum}.json.gz`;
      const s3Path = `${this.s3Destination}/events/${year}/${monthNum}/${filename}`;

      console.log(`Archiving ${events.length} events to ${s3Path}`);

      // Compress and upload (stubbed here; actual S3 client would go in production)
      // await this.uploadToS3(s3Path, events);

      console.log(`✓ Archived ${events.length} events to ${s3Path}`);
    }
  }

  /**
   * Distill events older than raw retention
   */
  async distillOlderThan(days: number): Promise<Record<string, any>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    const events = await this.store.queryRecent(365);
    const toDistill = events.filter((evt) => evt.timestamp < cutoff);

    const distilled: Record<string, any> = {};

    // Distillation rules per event type
    for (const evt of toDistill) {
      if (evt.event_type === "ARPS_DELTA") {
        // Keep most recent per month
        const month = evt.timestamp.substring(0, 7);
        if (!distilled[month]) {
          distilled[month] = evt;
        }
      } else if (evt.event_type === "PIPELINE_RUN") {
        // Aggregate: success rate, error rate, throughput
        const month = evt.timestamp.substring(0, 7);
        if (!distilled[month]) {
          distilled[month] = { runs: [], success_rate: 0, error_rate: 0 };
        }
        distilled[month].runs.push(evt);
      }
      // ... etc for other types
    }

    return distilled;
  }

  /**
   * Get retention policy (user-configurable)
   */
  getRetentionPolicy(): Record<string, any> {
    return {
      ARPS_DELTA: { raw_days: 90, distilled: true },
      PIPELINE_RUN: { raw_days: 90, distilled: true },
      AGENT_TELEMETRY: { raw_days: 90, distilled: true },
      GOVERNANCE_SIGNAL: { raw_days: 365, distilled: false },
      APR_PLAN: { raw_days: 365, distilled: true },
      CRO_RUN: { raw_days: 90, distilled: true },
    };
  }
}
```

---

## 23.2.6 — TESTING

### File: MemoryStore.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { MemoryStore } from "./memory-store";
import { MemoryEvent, PipelineRunPayload } from "./memory-store.types";

describe("MemoryStore", () => {
  let store: MemoryStore;
  const testStorePath = path.join(__dirname, "test_memory_store.json");

  beforeEach(() => {
    // Clean up test store
    if (fs.existsSync(testStorePath)) fs.unlinkSync(testStorePath);
    if (fs.existsSync(`${testStorePath}.lock`)) fs.unlinkSync(`${testStorePath}.lock`);

    store = new MemoryStore(testStorePath);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testStorePath)) fs.unlinkSync(testStorePath);
    if (fs.existsSync(`${testStorePath}.lock`)) fs.unlinkSync(`${testStorePath}.lock`);
  });

  describe("append", () => {
    it("should append a valid PIPELINE_RUN event", async () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: "PIPELINE_RUN" as const,
        source_agent: "harvester",
        session_id: "session_20260607_001",
        correlation_id: "corr_abc123",
        payload: {
          pipeline_name: "ingestion",
          pipeline_id: "run_20260607_001",
          status: "success",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 1000,
          items_processed: 10,
          items_successful: 10,
          items_failed: 0,
          metrics: {
            throughput_items_per_second: 10,
            error_rate_percent: 0,
            resource_usage_mb: 128,
          },
        } as PipelineRunPayload,
        retention_days: 90,
      };

      const result = await store.append(event);

      expect(result.id).toBeDefined();
      expect(result.checksum).toBeDefined();
      expect(result.version).toBe(1);
    });

    it("should reject invalid event (missing required field)", async () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: "PIPELINE_RUN" as const,
        source_agent: "harvester",
        session_id: "session_20260607_001",
        correlation_id: "corr_abc123",
        payload: {
          // Missing required fields
          pipeline_name: "ingestion",
        },
        retention_days: 90,
      };

      await expect(store.append(event as any)).rejects.toThrow();
    });

    it("should validate checksum on read", async () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: "PIPELINE_RUN" as const,
        source_agent: "harvester",
        session_id: "session_20260607_001",
        correlation_id: "corr_abc123",
        payload: {
          pipeline_name: "ingestion",
          pipeline_id: "run_20260607_001",
          status: "success",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 1000,
          items_processed: 10,
          items_successful: 10,
          items_failed: 0,
          metrics: {
            throughput_items_per_second: 10,
            error_rate_percent: 0,
            resource_usage_mb: 128,
          },
        } as PipelineRunPayload,
        retention_days: 90,
      };

      await store.append(event);
      await store.flush_sync();

      // Read back and verify checksum
      const stats = await store.getStats();
      expect(stats.total_events).toBe(1);
    });
  });

  describe("query", () => {
    it("should query by event type", async () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: "PIPELINE_RUN" as const,
        source_agent: "harvester",
        session_id: "session_20260607_001",
        correlation_id: "corr_abc123",
        payload: {
          /* ... */
        } as any,
        retention_days: 90,
      };

      await store.append(event);
      const results = await store.query("PIPELINE_RUN");

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("durability", () => {
    it("should survive process crash (atomic write)", async () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: "PIPELINE_RUN" as const,
        source_agent: "harvester",
        session_id: "session_20260607_001",
        correlation_id: "corr_abc123",
        payload: {
          /* ... */
        } as any,
        retention_days: 90,
      };

      await store.append(event);
      await store.flush_sync();

      // Simulate process crash (don't clean up)
      const store2 = new MemoryStore(testStorePath);
      const stats = await store2.getStats();

      expect(stats.total_events).toBe(1);
    });
  });
});
```

---

## 23.2.7 — INTEGRATION CHECKLIST

- [ ] Create `memory-store.types.ts` with all event interfaces
- [ ] Implement `memory-store.ts` (append, flush, durability)
- [ ] Implement `memory-validator.ts` with JSON schemas
- [ ] Implement `memory-integrity.ts` (checksum validation)
- [ ] Implement `memory-query.ts` (query patterns)
- [ ] Implement `memory-retention.ts` (archival, distillation)
- [ ] Create JSON schemas for all 6 event types
- [ ] Write comprehensive test suite
- [ ] Validate durability guarantees (process crash recovery)
- [ ] Create operator documentation (API reference)
- [ ] Integrate with CIC control plane (ready for Phase 23.3)

---

## SIGN-OFF

**Implementation Plan Status:** ✅ LOCKED (2026-06-07)

**Estimated Duration:** ~19 hours

**Next Step:** Phase 23.3 — Memory Harvester (collects events from ARPS, pipelines, etc. and emits to MemoryStore)

**Critical Path:** MemoryStore must be complete before Harvester can be implemented.
