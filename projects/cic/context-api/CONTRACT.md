# CIC Context API Contract

**Version:** 1.0.0  
**Date:** 2026-06-04  
**Status:** DRAFT  
**Stability:** Experimental (API subject to change until 2.0.0 release)

---

## Overview

The CIC Context API is a unified data contract for integrating three core systems:

1. **CRG** — code-review-graph: structural code intelligence
2. **CIC** — Cast Iron Charlie: documentary and archival intelligence
3. **Ruflo** — multi-agent execution orchestration

This contract defines:
- Data shapes passed between systems
- Request/response schemas
- Error codes and retry semantics
- Versioning and backward compatibility
- Observability and tracing requirements

---

## Core Data Model

### Context

A **Context** is a minimal, lazy-loaded representation of code and narrative state.

```typescript
interface Context {
  id: string;                          // UUID
  type: "code" | "narrative" | "hybrid";
  version: string;                     // semantic
  timestamp: ISO8601;
  
  // Code metadata (from CRG)
  code?: {
    repo: string;
    branch: string;
    commit: string;
    files: ContextFile[];
  };
  
  // Narrative metadata (from CIC)
  narrative?: {
    section: string;
    doc_id: string;
    tags: string[];
  };
  
  // Minimal set (always present)
  minimal: {
    repo?: string;
    doc_id?: string;
    commit?: string;
    section?: string;
  };
  
  // Observability
  trace_id: string;
  parent_span_id?: string;
}
```

### ContextFile

A file reference with slice boundaries and relationships.

```typescript
interface ContextFile {
  path: string;
  language: string;
  
  // Minimal context slices
  slices: ContextSlice[];
  
  // Relationships to other files
  imports: string[];      // file paths
  imported_by: string[];
}
```

### ContextSlice

A semantic unit within a file (function, class, section, etc.).

```typescript
interface ContextSlice {
  id: string;                    // e.g., "Foo.bar:24-67"
  type: "function" | "class" | "section" | "block";
  start_line: number;
  end_line: number;
  
  // Lazy-loaded content
  content?: string;              // call /slices/:id to load
  
  // Semantic tags
  tags: string[];
  
  // Relationships
  calls: string[];               // slice IDs
  called_by: string[];
}
```

---

## Request/Response Schemas

### GET /context/:id

Retrieve context metadata (minimal, lazy).

**Response 200:**
```json
{
  "context": {
    "id": "ctx-abc123",
    "type": "code",
    "version": "1.0.0",
    "timestamp": "2026-06-04T21:00:00Z",
    "code": {
      "repo": "rewrite-mcp",
      "branch": "main",
      "commit": "abc123def456",
      "files": [
        {
          "path": "tools/mcp/idea-inbox-server.js",
          "language": "javascript",
          "slices": [
            {
              "id": "idea-inbox-server.js:sendMessage:28-43",
              "type": "function",
              "start_line": 28,
              "end_line": 43,
              "tags": ["http", "json-rpc"],
              "calls": ["startServer"]
            }
          ]
        }
      ]
    },
    "minimal": {
      "repo": "rewrite-mcp",
      "commit": "abc123def456"
    },
    "trace_id": "trace-xyz789"
  }
}
```

**Error 404:**
```json
{
  "error": "context_not_found",
  "message": "No context with id ctx-abc123",
  "trace_id": "trace-xyz789"
}
```

### GET /context/:id/slices/:slice_id

Load full content of a slice (lazy-loading).

**Response 200:**
```json
{
  "slice": {
    "id": "idea-inbox-server.js:sendMessage:28-43",
    "content": "function sendMessage(message) {\n  return new Promise(...",
    "tags": ["http", "json-rpc"],
    "calls": ["startServer"],
    "called_by": ["runAllTests"],
    "trace_id": "trace-xyz789"
  }
}
```

### POST /context/query

Semantic search across contexts.

**Request:**
```json
{
  "query": "idea capture and deduplication logic",
  "context_id": "ctx-abc123",
  "limit": 10,
  "trace_id": "trace-xyz789"
}
```

**Response 200:**
```json
{
  "results": [
    {
      "slice_id": "idea-inbox-server.js:captureIdea:150-200",
      "score": 0.87,
      "snippet": "const result = await deduplicateIdea(idea);"
    }
  ],
  "trace_id": "trace-xyz789"
}
```

---

## Error Codes

| Code | HTTP | Meaning | Retry? |
|------|------|---------|--------|
| `context_not_found` | 404 | Context ID not found | No |
| `slice_not_loaded` | 404 | Slice ID not found in context | No |
| `query_malformed` | 400 | Query syntax error | No |
| `backend_unavailable` | 503 | CRG or CIC backend offline | Yes (exponential backoff) |
| `timeout` | 504 | Request exceeded deadline | Yes (with longer delay) |
| `version_mismatch` | 412 | API version incompatible | No (upgrade client) |

---

## Versioning

### Semantic Versioning

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes (incompatible schema)
- **MINOR**: Additive changes (new fields, new endpoints, backward compatible)
- **PATCH**: Bug fixes, documentation

### Backward Compatibility

- New optional fields are always backward compatible
- Removing or renaming fields requires MAJOR version bump
- All responses include `version` field

### Version Negotiation

Client sends preferred version in header:

```
X-CIC-Context-API-Version: 1.0.0
```

Server responds with:

```
X-CIC-Context-API-Version: 1.0.0
```

If versions are incompatible, server returns 412 with upgrade instructions.

---

## Observability Requirements

### Tracing

All requests must include trace context:

```
X-Trace-ID: trace-abc123
X-Parent-Span-ID: span-def456  (optional)
```

Response includes:

```
X-Trace-ID: trace-abc123
X-Span-ID: span-ghi789
```

Traces flow through CRG, CIC, and Ruflo for end-to-end visibility.

### Metrics

Each endpoint publishes:

- `context_api.request_duration_ms` — histogram
- `context_api.errors_total` — counter by error code
- `context_api.cache_hits` — counter (for lazy-loaded slices)

---

## Implementation Notes

1. **Lazy Loading**: Slice content is not loaded by default. Consumers must call `/slices/:id` to fetch full content. This keeps initial responses fast.

2. **Minimal Context**: The `minimal` object always contains the smallest viable data to identify the context. Consumers can bootstrap from this.

3. **Trace Propagation**: All requests propagate trace IDs down to CRG and CIC. This enables distributed tracing.

4. **Stateless**: The Context API is stateless. Clients are responsible for storing context references.

---

## Future Enhancements (Post-1.0)

- [ ] Streaming endpoints for large contexts
- [ ] Batch query support
- [ ] Context diffing (diff two contexts)
- [ ] Relationship traversal (follow calls across files)
- [ ] Narrative cross-linking (narrative refs to code)
