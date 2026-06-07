/**
 * Phase 23.1 — Memory Substrate
 * Append-only event store with schema validation, retention policy, and immutability guarantees
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export type EventType =
  | "ARPS_DELTA"
  | "PIPELINE_RUN"
  | "AGENT_TELEMETRY"
  | "GOVERNANCE_SIGNAL"
  | "APR_PLAN"
  | "CRO_RUN"
  | "PLATFORM_EXTRACTION";

export interface MemoryEvent {
  id: string;
  timestamp: string;
  event_type: EventType;
  source_agent: string;
  session_id: string;
  correlation_id: string;
  payload: Record<string, any>;
  retention_days: number;
  checksum: string;
  version: number;
}

export interface MemoryStoreConfig {
  store_path: string;
  max_file_size_mb: number;
  auto_archive: boolean;
  archive_destination: string;
  retention_policy: Record<EventType, number>;
}

const DEFAULT_CONFIG: MemoryStoreConfig = {
  store_path: "./memory_store.jsonl",
  max_file_size_mb: 100,
  auto_archive: true,
  archive_destination: "./memory_archive",
  retention_policy: {
    ARPS_DELTA: 90,
    PIPELINE_RUN: 90,
    AGENT_TELEMETRY: 90,
    GOVERNANCE_SIGNAL: 365,
    APR_PLAN: 365,
    CRO_RUN: 90,
    PLATFORM_EXTRACTION: 90,
  },
};

export class MemorySubstrate {
  private config: MemoryStoreConfig;
  private lockFile: string;

  constructor(config: Partial<MemoryStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lockFile = this.config.store_path + ".lock";
    this.ensureStoreExists();
  }

  private ensureStoreExists(): void {
    const dir = path.dirname(this.config.store_path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.config.store_path)) {
      fs.writeFileSync(this.config.store_path, "");
    }
  }

  private computeChecksum(event: Omit<MemoryEvent, "checksum"> & { checksum?: string }): string {
    const { checksum, ...rest } = event as any;
    const payload = JSON.stringify(rest);
    return "sha256:" + crypto.createHash("sha256").update(payload).digest("hex");
  }

  private validateEventSchema(event: Omit<MemoryEvent, "checksum">): void {
    if (!event.id || typeof event.id !== "string") {
      throw new Error("Event must have valid id (UUID)");
    }
    if (!event.timestamp || typeof event.timestamp !== "string") {
      throw new Error("Event must have valid timestamp (ISO8601)");
    }
    if (!event.event_type || !this.isValidEventType(event.event_type)) {
      throw new Error(`Event type must be one of: ${Object.keys(DEFAULT_CONFIG.retention_policy).join(", ")}`);
    }
    if (!event.source_agent || typeof event.source_agent !== "string") {
      throw new Error("Event must have source_agent");
    }
    if (!event.session_id || !event.session_id.match(/^session_\d{8}_\d{3,}$/)) {
      throw new Error("Event must have valid session_id (session_YYYYMMDD_NNN)");
    }
    if (!event.correlation_id || !event.correlation_id.match(/^corr_[a-z0-9]{6,}$/)) {
      throw new Error("Event must have valid correlation_id (corr_xxxxxx)");
    }
    if (typeof event.payload !== "object" || event.payload === null) {
      throw new Error("Event must have payload object");
    }
    if (typeof event.retention_days !== "number" || event.retention_days <= 0) {
      throw new Error("Event must have positive retention_days");
    }
  }

  private isValidEventType(type: string): type is EventType {
    return Object.keys(DEFAULT_CONFIG.retention_policy).includes(type);
  }

  async append(event: Omit<MemoryEvent, "checksum">): Promise<void> {
    // Validate schema
    this.validateEventSchema(event);

    // Compute checksum
    const checksum = this.computeChecksum(event);

    // Create complete event
    const completeEvent: MemoryEvent = {
      ...event,
      checksum,
    };

    // Acquire lock
    await this.acquireLock();
    try {
      // Write to temporary file
      const tmpPath = this.config.store_path + ".tmp";
      const existing = this.readAllEvents();
      const allEvents = [...existing, completeEvent];

      fs.writeFileSync(tmpPath, allEvents.map(e => JSON.stringify(e)).join("\n") + "\n");

      // Atomic rename
      fs.renameSync(tmpPath, this.config.store_path);

      // Periodic archival check
      if (this.config.auto_archive && allEvents.length % 100 === 0) {
        await this.archiveOldEvents();
      }
    } finally {
      this.releaseLock();
    }
  }

  async query(filters: {
    event_type?: EventType;
    source_agent?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MemoryEvent[]> {
    const events = this.readAllEvents();

    let filtered = events;

    if (filters.event_type) {
      filtered = filtered.filter(e => e.event_type === filters.event_type);
    }
    if (filters.source_agent) {
      filtered = filtered.filter(e => e.source_agent === filters.source_agent);
    }
    if (filters.from_date) {
      const fromTime = new Date(filters.from_date).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= fromTime);
    }
    if (filters.to_date) {
      const toTime = new Date(filters.to_date).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= toTime);
    }

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 1000;

    return filtered.slice(offset, offset + limit);
  }

  private readAllEvents(): MemoryEvent[] {
    if (!fs.existsSync(this.config.store_path)) {
      return [];
    }

    const content = fs.readFileSync(this.config.store_path, "utf-8");
    if (!content.trim()) {
      return [];
    }

    const events: MemoryEvent[] = [];
    const lines = content.split("\n").filter(line => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as MemoryEvent;
        // Verify checksum
        const recomputedChecksum = this.computeChecksum({ ...event, checksum: undefined as any });
        if (recomputedChecksum !== event.checksum) {
          console.warn(`CHECKSUM_MISMATCH: Event ${event.id} may be corrupted`);
        }
        events.push(event);
      } catch (err) {
        console.warn(`PARSE_ERROR: Failed to parse event line: ${line.slice(0, 50)}...`);
      }
    }

    return events;
  }

  private async archiveOldEvents(): Promise<void> {
    const allEvents = this.readAllEvents();
    const now = new Date();

    const toArchive: MemoryEvent[] = [];
    const toKeep: MemoryEvent[] = [];

    for (const event of allEvents) {
      const eventDate = new Date(event.timestamp);
      const ageInDays = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      const retentionDays = this.config.retention_policy[event.event_type] || 90;

      if (ageInDays > retentionDays) {
        toArchive.push(event);
      } else {
        toKeep.push(event);
      }
    }

    if (toArchive.length === 0) {
      return;
    }

    // Write archive
    if (!fs.existsSync(this.config.archive_destination)) {
      fs.mkdirSync(this.config.archive_destination, { recursive: true });
    }

    const archiveDate = now.toISOString().slice(0, 7); // YYYY-MM
    const archiveFile = path.join(
      this.config.archive_destination,
      `memory_archive_${archiveDate}.jsonl.gz`
    );

    // For now, write uncompressed (compression can be added later)
    const archiveContent = toArchive.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.writeFileSync(archiveFile, archiveContent);

    // Update main store with only kept events
    fs.writeFileSync(
      this.config.store_path,
      toKeep.map(e => JSON.stringify(e)).join("\n") + "\n"
    );

    console.log(`ARCHIVED: ${toArchive.length} events to ${archiveFile}`);
  }

  private async acquireLock(): Promise<void> {
    // Simple file-based lock (can be upgraded to better locking mechanism)
    const maxAttempts = 100;
    let attempts = 0;

    while (fs.existsSync(this.lockFile) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to acquire lock on memory store");
    }

    fs.writeFileSync(this.lockFile, process.pid.toString());
  }

  private releaseLock(): void {
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }
  }

  getStats(): {
    total_events: number;
    events_by_type: Record<EventType, number>;
    oldest_event: string | null;
    newest_event: string | null;
    store_size_mb: number;
  } {
    const events = this.readAllEvents();
    const stats = {
      total_events: events.length,
      events_by_type: {} as Record<EventType, number>,
      oldest_event: null as string | null,
      newest_event: null as string | null,
      store_size_mb: 0,
    };

    for (const event of events) {
      stats.events_by_type[event.event_type] =
        (stats.events_by_type[event.event_type] || 0) + 1;
    }

    if (events.length > 0) {
      stats.oldest_event = events[0].timestamp;
      stats.newest_event = events[events.length - 1].timestamp;
    }

    if (fs.existsSync(this.config.store_path)) {
      const statInfo = fs.statSync(this.config.store_path);
      stats.store_size_mb = statInfo.size / (1024 * 1024);
    }

    return stats;
  }
}
