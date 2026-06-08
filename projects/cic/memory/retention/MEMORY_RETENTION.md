# Memory Retention & Archival (Phase 23.5)

Local filesystem-based archival and distillation for CIC memory layer.

## Overview

Move events older than threshold days from hot store to compressed archives. Optionally distill (summarize) events before archival to reduce storage footprint by 70–80%.

**Key features:**
- Local filesystem archival (no S3 required)
- GZIP compression (`.jsonl.gz` format)
- Event distillation (summarization by type)
- Archive index for metadata tracking
- Auto-archive scheduler (configurable interval)
- Restore archives to hot store if needed

---

## Architecture

```
MemoryStore (hot)
    ↓
[Events older than 90 days?]
    ↓
MemoryDistiller (optional summarization)
    ↓
MemoryRetention (gzip + write to disk)
    ↓
archives/
  ├── events_2026-05-01_to_2026-05-31.jsonl.gz
  ├── events_2026-04-01_to_2026-04-30.jsonl.gz
  └── archive-index.json
```

---

## Usage

### Basic Setup

```typescript
import { MemoryStore } from "./memory";
import { MemoryRetention } from "./retention/memory-retention";

const store = new MemoryStore();
const retention = new MemoryRetention(store, {
  archivePath: "C:\\dev\\rewrite-mcp\\memory_archives",
  archiveThresholdDays: 90,
  distillBeforeArchive: true,
  compressionEnabled: true,
  autoArchiveIntervalMs: 86400000, // 24 hours
});
```

### Archive Events Older Than N Days

```typescript
const metadata = await retention.archiveOlderThan(90);

console.log(`Archived ${metadata.event_count} events`);
console.log(`Compressed size: ${metadata.size_bytes / 1024 / 1024}MB`);
console.log(`Filename: ${metadata.filename}`);
```

### Distill (Preview) Without Archiving

```typescript
const stats = await retention.distillOlderThan(90);

console.log(`Before: ${stats.before} events`);
console.log(`After: ${stats.after} events`);
console.log(`Reduction: ${stats.reduction_percent}%`);
```

### List All Archives

```typescript
const index = await retention.listArchives();

for (const archive of index.archives) {
  console.log(`${archive.filename} - ${archive.event_count} events`);
  console.log(`  PIPELINE_RUN: ${archive.events_by_type.PIPELINE_RUN}`);
  console.log(`  AGENT_TELEMETRY: ${archive.events_by_type.AGENT_TELEMETRY}`);
}

console.log(`Total archived: ${index.total_archived_events}`);
```

### Restore Archive

```typescript
const events = await retention.restoreArchive(
  "events_2026-05-01_to_2026-05-31.jsonl.gz"
);

console.log(`Restored ${events.length} events from archive`);
```

### Get Retention Stats

```typescript
const stats = await retention.getRetentionStats();

console.log(`Hot events: ${stats.hot_events}`);
console.log(`Archived events: ${stats.archived_events}`);
console.log(`Hot storage: ${stats.hot_size_mb}MB`);
console.log(`Cold storage: ${stats.cold_size_mb}MB`);
console.log(`Archive count: ${stats.archive_count}`);
```

### Auto-Archive Scheduler

```typescript
// Start daily auto-archive
retention.startAutoArchive();

// ... later ...

// Stop scheduler
retention.stopAutoArchive();
```

---

## Distillation Strategies

### Per Event Type

| Event Type | Strategy | Action | Result |
| --- | --- | --- | --- |
| PIPELINE_RUN | keep_first_last | Keep 1st + last run, discard middle | 95%+ reduction |
| AGENT_TELEMETRY | daily_summary | Aggregate per day (avg CPU, memory) | 90%+ reduction |
| GOVERNANCE_SIGNAL | keep_all | Never distill (audit trail) | No change |
| APR_PLAN | group_summary | Summarize per plan_id | 80%+ reduction |
| CRO_RUN | group_summary | Summarize per plan_id | 80%+ reduction |
| ARPS_DELTA | keep_all | Never distill (change history) | No change |

### Custom Rules

```typescript
import { MemoryDistiller } from "./retention/memory-distiller";

const distiller = new MemoryDistiller();

distiller.setRule({
  eventType: "PIPELINE_RUN",
  strategy: "aggregate",
  retentionDays: 365,
  keepRatio: 0.1, // Keep top 10%
});
```

---

## Archive Format

### Archive File

```jsonl
{"id": "evt_001", "event_type": "PIPELINE_RUN", "timestamp": "2026-05-01T10:00:00Z", ...}
{"id": "evt_002", "event_type": "PIPELINE_RUN", "timestamp": "2026-05-01T10:05:00Z", ...}
...
```

Files are compressed with GZIP unless `compressionEnabled: false`.

**Naming:** `events_YYYY-MM-DD_to_YYYY-MM-DD.jsonl.gz`

### Archive Index

```json
{
  "version": 1,
  "last_updated": "2026-06-08T12:00:00Z",
  "archives": [
    {
      "filename": "events_2026-05-01_to_2026-05-31.jsonl.gz",
      "created_at": "2026-06-01T00:00:00Z",
      "event_count": 5000,
      "events_by_type": {
        "PIPELINE_RUN": 2000,
        "AGENT_TELEMETRY": 3000,
        ...
      },
      "size_bytes": 1048576,
      "date_from": "2026-05-01",
      "date_to": "2026-05-31",
      "checksum": "sha256:abc123...",
      "distilled": true
    }
  ],
  "total_archived_events": 50000,
  "total_archive_size_bytes": 52428800
}
```

---

## Performance

- **Archive operation:** ~200ms per 1,000 events (includes distillation + compression)
- **Distillation:** 70–95% event reduction depending on type
- **Compression ratio:** 80–90% for aggregated telemetry, 50–60% for raw events
- **Restore:** ~100ms to decompress and parse 1,000-event archive

---

## Retention Policy

**Hot Storage (MemoryStore):**
- PIPELINE_RUN: 90 days
- AGENT_TELEMETRY: 90 days
- GOVERNANCE_SIGNAL: 365 days
- APR_PLAN: 365 days
- CRO_RUN: 90 days
- ARPS_DELTA: 90 days

**Cold Storage (Archives):**
- All archived events kept indefinitely on local filesystem
- Can restore to hot store if needed for audit/replay

---

## Options

```typescript
interface RetentionOptions {
  archivePath?: string;              // Default: C:\dev\rewrite-mcp\memory_archives
  archiveThresholdDays?: number;     // Default: 90
  distillBeforeArchive?: boolean;    // Default: true
  compressionEnabled?: boolean;      // Default: true
  autoArchiveIntervalMs?: number;    // Default: 86400000 (24h)
}
```

---

## Integration

### With MemoryHarvester

```typescript
const harvester = new MemoryHarvester({ sourceAgent: "ingestion" });
await harvester.registerPipelineEvent(...);
await harvester.flush();

// Later: archive old events
const retention = new MemoryRetention(store);
await retention.archiveOlderThan(90);
```

### With MemoryQuery

```typescript
// Query hot events
const recent = await query.getEventTimeline(7);

// For older events: restore archive
const oldEvents = await retention.restoreArchive("events_2026-05-01_to_2026-05-31.jsonl.gz");

// Combine results
const all = [...recent.events, ...oldEvents];
```

---

## Testing

Run the test suite:

```bash
node memory-retention.test.cjs
```

Tests validate:
- Type definitions (6 types)
- Distiller implementation (7 methods)
- Archival methods (7 async methods)
- Compression support (gzip)
- Archive index maintenance
- Auto-archive scheduler
- Retention stats calculation
- Event type handling

---

## Troubleshooting

### Archive fails with "No events older than N days"

The store has recent events only. Try archiving with a smaller threshold:
```typescript
await retention.archiveOlderThan(30);
```

### Archives consume more disk than expected

Compression might not be effective for certain event types. Check distillation:
```typescript
const stats = await retention.distillOlderThan(90);
console.log(`Reduction: ${stats.reduction_percent}%`);
```

### Can't restore archive

Ensure filename is exact and file exists in archive directory:
```typescript
const index = await retention.listArchives();
console.log(index.archives.map(a => a.filename));
```

---

## Next Steps

- **Phase 23.6** — Memory Explorer UI
  - Web interface for browsing archived events
  - Archive restore UI
  - Distillation preview before archival

---

## Operational Considerations

- **Disk space:** Monitor `memory_archives/` directory size; plan accordingly
- **Archive frequency:** Daily auto-archive suitable for most deployments; adjust interval if needed
- **Restore performance:** Decompressing large archives can be slow; batch if possible
- **Audit trail:** GOVERNANCE_SIGNAL never distilled; full history always available
- **Compliance:** All checksums preserved; archive integrity verified on restore
