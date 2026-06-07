---
title: Phase 46 — CIC ↔ Wayland Integration Layer (WIL) — Detailed Architecture
version: 1.0.0
date: 2026-06-06
status: DESIGN
---

# Phase 46 — Detailed Architecture & Integration Specification

**Purpose:** Lock in the concrete data structures, API contracts, and error-handling paths for CIC's integration with Wayland as a first-class sandboxed agent.

---

## 1. CIC Foreman Service Architecture (46.1)

### 1.1 HTTP Service Spec

**Service Name:** `cic_foreman`  
**Binding:** `127.0.0.1:3035`  
**Protocol:** HTTP/1.1 (JSON payloads)  
**Health Check Interval:** 3000ms  
**Health Check Timeout:** 1000ms  

### 1.2 Core Data Model

```typescript
// Task state machine
type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface TaskRecord {
  id: string;                           // UUID v4
  created_at: string;                   // ISO 8601
  updated_at: string;                   // ISO 8601 (updated on status change)
  status: TaskStatus;
  correlation_id: string;               // UUID v4 (same for all sub-events)
  
  // Pipeline metadata
  pipeline_name: string;                // e.g., "INGEST", "ENRICH"
  pipeline_phase: number;               // Phase number triggering this task
  
  // Execution tracking
  started_at?: string;                  // ISO 8601 (when status → "running")
  completed_at?: string;                // ISO 8601 (when status → "completed" or "failed")
  duration_ms?: number;                 // (completed_at - started_at) in milliseconds
  
  // Logs and events
  logs: LogEntry[];
  governance_events: GovernanceEvent[];
  
  // Artifacts
  artifacts: Map<string, ArtifactMetadata>;
  
  // Error tracking
  error?: {
    code: string;                       // e.g., "TOOL_EXECUTION_FAILED"
    message: string;
    details?: Record<string, any>;
    stack?: string;                     // Error stack (server-side only, not exposed to Wayland)
  };
}

interface LogEntry {
  timestamp: string;                    // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  agent: string;                        // e.g., "Foreman", "Ingestor", "Extractor"
  message: string;
  metadata?: Record<string, any>;       // Structured context
  correlation_id: string;               // Links back to TaskRecord
}

interface GovernanceEvent {
  timestamp: string;
  event_type: "approval" | "rejection" | "escalation" | "override";
  reason: string;
  agent: string;                        // e.g., "ARL Threshold Model"
  severity: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
}

interface ArtifactMetadata {
  artifact_id: string;                  // UUID v4
  type: "json" | "html" | "pdf" | "image" | "text" | "binary";
  path: string;                         // Relative to `/cic_workspace/artifacts/{task_id}/`
  size_bytes: number;
  created_at: string;                   // ISO 8601
  checksum: string;                     // SHA256 hex
  brand?: "CIC";                        // Branding signal for Wayland UI
  accent_color?: string;                // e.g., "#35C2FF"
}
```

### 1.3 API Routes

#### **POST /task**

**Purpose:** Submit a new CIC pipeline task.

**Request:**

```json
{
  "pipeline_name": "INGEST",
  "pipeline_phase": 1,
  "input": {
    "source": "archival_records",
    "filters": {
      "date_from": "1930-01-01",
      "date_to": "1960-12-31"
    }
  },
  "metadata": {
    "tenant": "cast_iron_charlie",
    "region": "north_america",
    "priority": "high"
  }
}
```

**Response (201 Created):**

```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "correlation_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  "status": "pending",
  "created_at": "2026-06-06T22:10:00Z",
  "pipeline_name": "INGEST",
  "pipeline_phase": 1
}
```

**Error Responses:**

- **400 Bad Request:** Invalid input (missing `pipeline_name`, invalid filters, etc.)
- **413 Payload Too Large:** Input exceeds 10 MB
- **500 Internal Server Error:** Foreman unable to enqueue (queue full, etc.)

---

#### **GET /status/:task_id**

**Purpose:** Retrieve full task status, logs, and governance events.

**Response (200 OK):**

```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "correlation_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  "status": "running",
  "created_at": "2026-06-06T22:10:00Z",
  "updated_at": "2026-06-06T22:10:15Z",
  "started_at": "2026-06-06T22:10:05Z",
  "pipeline_name": "INGEST",
  "pipeline_phase": 1,
  
  "logs": [
    {
      "timestamp": "2026-06-06T22:10:05Z",
      "level": "info",
      "agent": "Foreman",
      "message": "Pipeline INGEST initiated",
      "metadata": {
        "tenant": "cast_iron_charlie",
        "region": "north_america"
      },
      "correlation_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6"
    },
    {
      "timestamp": "2026-06-06T22:10:06Z",
      "level": "info",
      "agent": "Ingestor",
      "message": "Fetching archival records from LOC",
      "metadata": {
        "connector": "LOC",
        "query": "Charles Sorensen Ford 1930-1960"
      },
      "correlation_id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6"
    }
  ],
  
  "governance_events": [
    {
      "timestamp": "2026-06-06T22:10:07Z",
      "event_type": "approval",
      "reason": "Temporal consistency check passed",
      "agent": "ARL Memory Engine",
      "severity": "info"
    }
  ],
  
  "artifacts": [
    {
      "artifact_id": "a1b2c3d4-uuid-4",
      "type": "json",
      "path": "archival_records_batch_1.json",
      "size_bytes": 245632,
      "created_at": "2026-06-06T22:10:12Z",
      "checksum": "abc123def456...",
      "brand": "CIC",
      "accent_color": "#35C2FF"
    }
  ]
}
```

**Error Responses:**

- **404 Not Found:** Task ID does not exist
- **500 Internal Server Error:** Task state corrupted or unreadable

---

#### **GET /artifact/:task_id/:artifact_id**

**Purpose:** Fetch artifact metadata and optionally stream the artifact content.

**Query Parameters:**

- `stream=true` — Return raw artifact content (with `Content-Type` header)
- `stream=false` (default) — Return metadata only

**Response (200 OK, metadata only):**

```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "artifact_id": "a1b2c3d4-uuid-4",
  "type": "json",
  "path": "archival_records_batch_1.json",
  "size_bytes": 245632,
  "created_at": "2026-06-06T22:10:12Z",
  "checksum": "abc123def456...",
  "url": "http://127.0.0.1:3035/artifact/f47ac10b-58cc-4372-a567-0e02b2c3d479/a1b2c3d4-uuid-4?stream=true",
  "brand": "CIC",
  "accent_color": "#35C2FF"
}
```

**Response (200 OK, streamed content):**

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 245632
X-Artifact-ID: a1b2c3d4-uuid-4
X-Artifact-Checksum: abc123def456...

[JSON content stream...]
```

**Error Responses:**

- **404 Not Found:** Task or artifact does not exist
- **413 Payload Too Large:** Artifact exceeds 25 MB (max enforced size)
- **416 Range Not Satisfiable:** Invalid stream range (if range headers used)

---

#### **GET /health**

**Purpose:** Wayland health check.

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2026-06-06T22:10:30Z",
  "uptime_ms": 12345,
  "version": "1.0.0",
  "queue_size": 3,
  "active_tasks": 1
}
```

---

### 1.4 Internal State Management

**In-Memory Task Store:**

```typescript
class TaskStore {
  private tasks: Map<string, TaskRecord> = new Map();
  private queue: string[] = [];  // task_ids in execution order
  private active: Set<string> = new Set();  // currently running task_ids
  
  // Bounded retention: keep last 1000 tasks; older tasks archived
  private max_retained = 1000;
  
  create(input: CreateTaskInput): TaskRecord {
    const id = uuid();
    const task: TaskRecord = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "pending",
      correlation_id: uuid(),
      ...input,
      logs: [],
      governance_events: [],
      artifacts: new Map(),
    };
    this.tasks.set(id, task);
    this.queue.push(id);
    this.prune();  // If >1000 tasks, archive oldest
    return task;
  }
  
  get(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }
  
  appendLog(taskId: string, entry: LogEntry): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.logs.push(entry);
      task.updated_at = new Date().toISOString();
    }
  }
  
  appendGovernanceEvent(taskId: string, event: GovernanceEvent): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.governance_events.push(event);
      task.updated_at = new Date().toISOString();
    }
  }
  
  setStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updated_at = new Date().toISOString();
      if (status === "running") task.started_at = new Date().toISOString();
      if (status === "completed" || status === "failed") {
        task.completed_at = new Date().toISOString();
        task.duration_ms = new Date(task.completed_at).getTime() - new Date(task.started_at!).getTime();
        this.active.delete(taskId);
      }
    }
  }
  
  private prune(): void {
    if (this.tasks.size > this.max_retained) {
      const archived = this.queue.shift();
      if (archived) this.tasks.delete(archived);
    }
  }
}
```

---

## 2. Wayland Tool Adapter Layer (46.2)

### 2.1 Adapter Interface Contract

Each adapter implements:

```typescript
interface WaylandToolAdapter {
  // Unique identifier (e.g., "wayland.shell")
  id: string;
  
  // Call a tool on the Wayland endpoint
  call(request: ToolRequest): Promise<ToolResponse>;
}

interface ToolRequest {
  id: string;                           // UUID v4 (for tracking)
  kind: "shell" | "model" | "file" | "http";
  payload: any;                         // Tool-specific input
  timeout_ms?: number;                  // Tool-specific timeout
  metadata?: Record<string, any>;       // Tracing, tenant, region, etc.
}

interface ToolResponse {
  id: string;                           // Echo request.id
  success: boolean;
  payload?: any;                        // Tool-specific output
  error?: {
    code: string;                       // e.g., "FORBIDDEN", "TIMEOUT"
    message: string;
    details?: Record<string, any>;
  };
  duration_ms: number;                  // Wall-clock execution time
  correlation_id: string;               // Wayland-assigned request ID
}
```

### 2.2 ShellTool Adapter

**Wayland Endpoint:** `http://127.0.0.1:3036/tool` (POST)

**CIC → Wayland Request:**

```json
{
  "id": "shell-req-uuid-1",
  "kind": "shell",
  "payload": {
    "command": "echo 'test output'",
    "cwd": "/cic_workspace",
    "env": {
      "CIC_TENANT": "cast_iron_charlie"
    },
    "timeout_ms": 5000
  },
  "metadata": {
    "agent": "Ingestor",
    "task_id": "task-uuid-1",
    "correlation_id": "corr-uuid-1"
  }
}
```

**Wayland → CIC Response:**

```json
{
  "id": "shell-req-uuid-1",
  "success": true,
  "payload": {
    "stdout": "test output\n",
    "stderr": "",
    "exit_code": 0,
    "timed_out": false
  },
  "duration_ms": 42,
  "correlation_id": "wayland-req-uuid-1"
}
```

**Error Cases:**

- `FORBIDDEN` — Command attempts to escape `/cic_workspace`
- `TIMEOUT` — Command exceeded `timeout_ms`
- `SPAWN_ERROR` — System unable to spawn shell

---

### 2.3 ModelTool Adapter

**Wayland Endpoint:** `http://127.0.0.1:3036/tool` (POST)

**CIC → Wayland Request:**

```json
{
  "id": "model-req-uuid-1",
  "kind": "model",
  "payload": {
    "model_id": "claude-opus-4.8",
    "prompt": "Summarize the Ford archives:",
    "system_prompt": "You are a research assistant for documentary filmmaking.",
    "temperature": 0.2,
    "max_tokens": 2048,
    "metadata": {
      "research_domain": "automotive_history"
    }
  },
  "timeout_ms": 30000,
  "metadata": {
    "agent": "Synthesizer",
    "task_id": "task-uuid-1",
    "correlation_id": "corr-uuid-1"
  }
}
```

**Wayland → CIC Response:**

```json
{
  "id": "model-req-uuid-1",
  "success": true,
  "payload": {
    "text": "The Ford Archives contain...",
    "usage": {
      "input_tokens": 150,
      "output_tokens": 512
    },
    "model_id": "claude-opus-4.8",
    "stop_reason": "end_turn"
  },
  "duration_ms": 2340,
  "correlation_id": "wayland-req-uuid-1"
}
```

**Error Cases:**

- `INVALID_MODEL_ID` — Model not registered with Wayland
- `RATE_LIMITED` — API quota exceeded
- `TIMEOUT` — Model inference exceeded timeout

---

### 2.4 FileTool Adapter

**Wayland Endpoint:** `http://127.0.0.1:3036/tool` (POST)

**CIC → Wayland Request (Read):**

```json
{
  "id": "file-req-uuid-1",
  "kind": "file",
  "payload": {
    "op": "read",
    "path": "/cic_workspace/artifacts/task-uuid-1/report.json"
  },
  "metadata": {
    "agent": "Ingestor",
    "task_id": "task-uuid-1",
    "correlation_id": "corr-uuid-1"
  }
}
```

**Wayland → CIC Response:**

```json
{
  "id": "file-req-uuid-1",
  "success": true,
  "payload": {
    "exists": true,
    "content": "{\"records\": [...]}",
    "size_bytes": 1024,
    "encoding": "utf-8"
  },
  "duration_ms": 5,
  "correlation_id": "wayland-req-uuid-1"
}
```

**CIC → Wayland Request (Write):**

```json
{
  "id": "file-req-uuid-2",
  "kind": "file",
  "payload": {
    "op": "write",
    "path": "/cic_workspace/artifacts/task-uuid-1/report.json",
    "content": "{\"records\": [...]}",
    "overwrite": false
  },
  "metadata": {
    "agent": "Synthesizer",
    "task_id": "task-uuid-1",
    "correlation_id": "corr-uuid-1"
  }
}
```

**Wayland → CIC Response:**

```json
{
  "id": "file-req-uuid-2",
  "success": true,
  "payload": {
    "path": "/cic_workspace/artifacts/task-uuid-1/report.json",
    "size_bytes": 1024,
    "checksum": "abc123def456...",
    "created_at": "2026-06-06T22:10:15Z"
  },
  "duration_ms": 8,
  "correlation_id": "wayland-req-uuid-1"
}
```

**Error Cases:**

- `FORBIDDEN` — Path escapes `/cic_workspace`
- `FILE_NOT_FOUND` — Read requested on non-existent file
- `FILE_EXISTS` — Write requested with `overwrite: false` on existing file
- `QUOTA_EXCEEDED` — Total workspace usage exceeds limit (e.g., 100 GB)

---

### 2.5 HttpTool Adapter

**Wayland Endpoint:** `http://127.0.0.1:3036/tool` (POST)

**CIC → Wayland Request:**

```json
{
  "id": "http-req-uuid-1",
  "kind": "http",
  "payload": {
    "method": "GET",
    "url": "https://api.loc.gov/collections/sorensen",
    "headers": {
      "User-Agent": "CIC/1.0"
    },
    "timeout_ms": 10000
  },
  "metadata": {
    "agent": "Ingestor",
    "task_id": "task-uuid-1",
    "correlation_id": "corr-uuid-1"
  }
}
```

**Wayland → CIC Response:**

```json
{
  "id": "http-req-uuid-1",
  "success": true,
  "payload": {
    "status": 200,
    "headers": {
      "content-type": "application/json",
      "content-length": "5432"
    },
    "body": "{\"results\": [...]}",
    "timed_out": false
  },
  "duration_ms": 850,
  "correlation_id": "wayland-req-uuid-1"
}
```

**Error Cases:**

- `FORBIDDEN_HOST` — URL not in Wayland's allow-list
- `TIMEOUT` — Request exceeded `timeout_ms`
- `DNS_ERROR` — Unable to resolve hostname
- `TLS_ERROR` — Certificate validation failed

---

## 3. CIC Pipeline ↔ Wayland Session Mapping (46.4)

### 3.1 Session Metadata

Each CIC pipeline run maps to a Wayland "session":

```typescript
interface WaylandSession {
  session_id: string;                   // UUID v4
  agent_name: "CIC Foreman";
  agent_icon: string;                   // Path to icon asset
  agent_color: string;                  // e.g., "#0B1B2B"
  
  // CIC context
  cic_task_id: string;                  // Links to TaskRecord
  cic_pipeline_name: string;
  cic_phase: number;
  
  // Wayland UI presentation
  title: string;                        // e.g., "CIC INGEST Pipeline"
  description: string;
  status: "running" | "completed" | "failed";
  
  // Timeline
  started_at: string;
  completed_at?: string;
  
  // Visibility in Wayland UI
  visibility: "public" | "private" | "admin";
}
```

### 3.2 Session Event Stream

CIC emits structured events to Wayland in real-time:

```json
{
  "type": "session_event",
  "session_id": "sess-uuid-1",
  "timestamp": "2026-06-06T22:10:15Z",
  "event": {
    "kind": "pipeline_step",
    "step": "ENRICH",
    "status": "running",
    "metadata": {
      "entities_enriched": 42,
      "confidence_threshold": 0.8
    },
    "correlation_id": "corr-uuid-1"
  }
}
```

**Event Types:**

- `pipeline_step` — A pipeline stage starts/completes
- `governance_event` — ARL approves/rejects an expansion
- `tool_call` — ShellTool/ModelTool/FileTool invoked
- `artifact_created` — New artifact written
- `error_occurred` — Exception caught

---

## 4. Artifact Integration (46.5)

### 4.1 Artifact Storage Structure

```
/cic_workspace/
  artifacts/
    {task_id}/
      artifact_{artifact_id}.json        (metadata + content for small files)
      artifact_{artifact_id}.bin         (large files, referenced by metadata)
      index.json                         (manifest of all artifacts in this task)
```

### 4.2 Artifact Metadata Schema

```typescript
interface ArtifactMetadata {
  artifact_id: string;
  task_id: string;
  type: "json" | "html" | "pdf" | "image" | "text" | "binary";
  filename: string;
  path: string;                         // Relative to `/cic_workspace/artifacts/{task_id}/`
  size_bytes: number;
  created_at: string;
  modified_at: string;
  checksum: string;                     // SHA256
  
  // For Wayland UI
  brand: "CIC";
  accent_color: string;                 // e.g., "#35C2FF"
  preview_url?: string;                 // For Wayland thumbnail rendering
  
  // Retention policy
  retention_days: number;               // Auto-delete after N days (default: 30)
  
  // Lineage
  generated_by: string;                 // Agent name
  generation_timestamp: string;
  pipeline_phase: number;
}
```

### 4.3 Artifact Lifecycle

1. **Creation** — Agent writes artifact to `/cic_workspace/artifacts/{task_id}/`
2. **Registration** — Artifact metadata appended to TaskRecord.artifacts
3. **Exposition** — GET `/artifact/:task_id/:artifact_id` serves metadata + content
4. **Retention** — Wayland or background job auto-purges after `retention_days`

---

## 5. Security Hardening (46.6)

### 5.1 Workspace Root Scoping

**Enforcement Point:** FileTool adapter.

```typescript
function validatePath(path: string): boolean {
  const normalized = path.normalize();
  const workspace_root = "/cic_workspace";
  
  // Reject: ../, absolute paths outside workspace, symlink escapes
  return normalized.startsWith(workspace_root) && 
         !normalized.includes("..") &&
         isNotSymlinkEscape(normalized);
}
```

### 5.2 Non-Interactive Shell Commands

**Enforcement Point:** ShellTool adapter.

```typescript
const forbidden_patterns = [
  /^([^;|&]*[;|&]|)read\s/i,           // read command
  /^([^;|&]*[;|&]|)pause\s/i,          // pause command
  /^([^;|&]*[;|&]|)prompt\s/i,         // prompt command
  /stdin\s*=\s*[^-]/i,                 // stdin redirection
  /\$\(read/i,                         // $(read ...) subshell
];

function isNonInteractive(command: string): boolean {
  return !forbidden_patterns.some(p => p.test(command));
}
```

### 5.3 API Key Management

**No Raw Keys in CIC Config:**

- CIC never stores API keys in plaintext
- All keys managed by Wayland key store
- CIC requests models via `model_id` only
- Wayland resolves `model_id` → API endpoint + credentials

---

## 6. Integration Test Plan (46.7)

### 6.1 Test Categories

1. **Health & Registration (5 tests)**
   - CIC Foreman `/health` returns `status: ok`
   - Wayland starts CIC process and marks agent as healthy
   - Agent manifest loads without errors
   - Agent capabilities declared correctly
   - Health check survives 10+ rapid pings

2. **Task Lifecycle (8 tests)**
   - `POST /task` returns valid task_id
   - `GET /status/{task_id}` returns pending status
   - Task transitions `pending → running → completed`
   - Logs accumulate in status payload
   - Governance events appear in status
   - Error case: invalid task_id returns 404
   - Artifact metadata appears in status
   - Completed task has duration_ms set

3. **ShellTool Integration (6 tests)**
   - CIC calls `ShellTool.run({ command: "echo hello" })`
   - Wayland executes shell, returns `stdout === "hello\n"`
   - Workspace root scoping enforced: `cd /etc && cat passwd` blocked
   - Timeout honored: long-running command killed
   - Non-interactive check enforced
   - Stderr captured alongside stdout

4. **ModelTool Integration (5 tests)**
   - CIC calls `ModelTool.generate({ model_id: "claude", prompt: "test" })`
   - Wayland routes to configured model
   - Response contains non-empty text
   - Token usage reported
   - Rate-limit error handled gracefully

5. **FileTool Integration (7 tests)**
   - CIC writes artifact via `FileTool.write`
   - File written to `/cic_workspace/artifacts/{task_id}/...`
   - CIC reads same file via `FileTool.read`
   - Content round-trips
   - Path validation enforces workspace root
   - Quota limit enforced (e.g., 100 GB)
   - Symlink escapes blocked

6. **HttpTool Integration (4 tests)**
   - CIC calls `HttpTool.request({ method: "GET", url: "https://example.com" })`
   - Wayland enforces timeout
   - Status code and body returned
   - Forbidden host blocked
   - TLS errors surfaced

7. **Error Handling (6 tests)**
   - Invalid `model_id` → `INVALID_INPUT` error
   - Forbidden file path → `FORBIDDEN` error
   - Timeout exceeded → `TIMEOUT` error
   - Tool adapter unavailable → `ADAPTER_ERROR` error
   - Malformed request → `BAD_REQUEST` error
   - Artifact exceeds 25 MB → `PAYLOAD_TOO_LARGE` error

8. **End-to-End Pipeline (3 tests)**
   - Submit a real CIC pipeline (e.g., "SMB benchmark run")
   - Pipeline uses all tools (shell, model, file, http) at least once
   - Artifacts are retrievable via `GET /artifact`
   - Task history persists and survives service restart

---

## 7. Branding Integration (46.8 — Optional, Post-Launch)

### 7.1 Visual Assets

**Target Directory:** `/branding/cic/`

```
branding/cic/
  cic_foreman_icon_16.png
  cic_foreman_icon_32.png
  cic_foreman_icon_64.png
  cic_foreman_icon_128.png
  cic_foreman_logo_horizontal.svg
  cic_foreman_logo_stack.svg
  README.md (usage guide)
```

### 7.2 Branding Manifest

```json
{
  "branding": {
    "name": "CIC Foreman",
    "icon_16": "branding/cic/cic_foreman_icon_16.png",
    "icon_32": "branding/cic/cic_foreman_icon_32.png",
    "icon_64": "branding/cic/cic_foreman_icon_64.png",
    "icon_128": "branding/cic/cic_foreman_icon_128.png",
    "logo_horizontal": "branding/cic/cic_foreman_logo_horizontal.svg",
    "logo_stack": "branding/cic/cic_foreman_logo_stack.svg",
    "primary_color": "#0B1B2B",
    "accent_color": "#35C2FF",
    "secondary_color": "#A3B1C2",
    "background_color": "#0A0A0A"
  }
}
```

### 7.3 Event-Level Branding

All `LogEntry` and `GovernanceEvent` include:

```json
{
  "brand": "CIC",
  "agent": "Foreman",
  "accent_color": "#35C2FF"
}
```

Wayland uses `brand` field to colorize logs automatically.

---

## 8. Dependency Graph & Blockers

```
46.1 (Foreman HTTP Service)
  ├→ 46.3 (Agent Manifest Registration)
  │   └→ 46.4 (Session Mapping)
  │
  ├→ 46.2 (Tool Adapter Layer)
  │   ├→ 46.5 (Artifact Integration)
  │   ├→ 46.6 (Security Hardening)
  │   └→ 46.7 (Integration Tests)
  │
  └→ 46.8 (Branding) ← OPTIONAL, post-launch
```

**Critical Path:** 46.1 → 46.2 → 46.6 → 46.7  
**Duration:** ~6 weeks (2 weeks per tier)

---

## 9. Handoff to Wayland

### 9.1 Integration Checklist

- [ ] CIC Foreman HTTP service running on `127.0.0.1:3035`
- [ ] All tool adapters (shell, model, file, http) wired to Wayland
- [ ] Agent manifest finalizes with correct capabilities list
- [ ] Session mapping emits real-time events to Wayland event stream
- [ ] All 8 test categories passing
- [ ] Security hardening enforced (workspace scoping, non-interactive shells)
- [ ] Branding assets committed and registered
- [ ] Documentation complete (this file + API reference)

### 9.2 Wayland Integration Points

1. **Agent Registry** — CIC registers `cic_foreman.agent.json`
2. **Event Stream** — Wayland subscribes to CIC session events
3. **Tool Endpoint** — Wayland exposes `http://127.0.0.1:3036/tool`
4. **File Viewer** — Wayland displays artifacts from `/cic_workspace/artifacts/`
5. **Session UI** — Wayland renders CIC pipeline runs with icons + colors

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-06  
**Status:** DESIGN LOCKED (ready for 46.1 implementation)
