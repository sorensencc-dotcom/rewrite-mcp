import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { MemoryStore } from "../store/memory-store";
import { MemoryEvent } from "../store/memory-store.types";
import { MemoryDistiller } from "./memory-distiller";
import {
  ArchiveMetadata,
  ArchiveIndex,
  RetentionStats,
  RetentionOptions,
} from "./memory-retention.types";

export class MemoryRetention {
  private store: MemoryStore;
  private distiller: MemoryDistiller;
  private archivePath: string;
  private archiveThresholdDays: number;
  private distillBeforeArchive: boolean;
  private compressionEnabled: boolean;
  private autoArchiveTimer: NodeJS.Timeout | null = null;
  private autoArchiveIntervalMs: number;

  constructor(store: MemoryStore, options: RetentionOptions = {}) {
    this.store = store;
    this.distiller = new MemoryDistiller();
    this.archivePath =
      options.archivePath || "C:\\dev\\rewrite-mcp\\memory_archives";
    this.archiveThresholdDays = options.archiveThresholdDays || 90;
    this.distillBeforeArchive = options.distillBeforeArchive ?? true;
    this.compressionEnabled = options.compressionEnabled ?? true;
    this.autoArchiveIntervalMs = options.autoArchiveIntervalMs || 86400000; // 24 hours

    this.ensureArchivePath();
  }

  private ensureArchivePath(): void {
    if (!fs.existsSync(this.archivePath)) {
      fs.mkdirSync(this.archivePath, { recursive: true });
    }
  }

  async archiveOlderThan(days: number): Promise<ArchiveMetadata> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    const allEvents = await this.store.query();
    const oldEvents = allEvents.filter((e) => e.timestamp < cutoff);

    if (oldEvents.length === 0) {
      throw new Error(`No events older than ${days} days to archive`);
    }

    const eventsToKeep = allEvents.filter((e) => e.timestamp >= cutoff);

    let eventsToArchive = oldEvents;
    if (this.distillBeforeArchive) {
      eventsToArchive = this.distiller.distillEvents(oldEvents);
      console.log(
        `✓ Distilled ${oldEvents.length} events → ${eventsToArchive.length}`
      );
    }

    const metadata = await this.writeArchive(eventsToArchive);
    console.log(`✓ Archived ${eventsToArchive.length} events to ${metadata.filename}`);

    return metadata;
  }

  async distillOlderThan(
    days: number
  ): Promise<Record<string, number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    const allEvents = await this.store.query();
    const oldEvents = allEvents.filter((e) => e.timestamp < cutoff);

    const before = oldEvents.length;
    const distilled = this.distiller.distillEvents(oldEvents);
    const after = distilled.length;

    return {
      before,
      after,
      reduction_percent: Math.round(((before - after) / before) * 100),
    };
  }

  async listArchives(): Promise<ArchiveIndex> {
    const indexPath = path.join(this.archivePath, "archive-index.json");

    if (!fs.existsSync(indexPath)) {
      return {
        version: 1,
        last_updated: new Date().toISOString(),
        archives: [],
        total_archived_events: 0,
        total_archive_size_bytes: 0,
      };
    }

    const content = fs.readFileSync(indexPath, "utf8");
    return JSON.parse(content) as ArchiveIndex;
  }

  async restoreArchive(filename: string): Promise<MemoryEvent[]> {
    const archivePath = path.join(this.archivePath, filename);

    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive not found: ${filename}`);
    }

    let content: string;
    if (filename.endsWith(".gz")) {
      const compressed = fs.readFileSync(archivePath);
      content = zlib.gunzipSync(compressed).toString("utf8");
    } else {
      content = fs.readFileSync(archivePath, "utf8");
    }

    const lines = content.trim().split("\n");
    const events: MemoryEvent[] = [];

    for (const line of lines) {
      if (line.trim()) {
        events.push(JSON.parse(line) as MemoryEvent);
      }
    }

    console.log(`✓ Restored ${events.length} events from ${filename}`);
    return events;
  }

  async getRetentionStats(): Promise<RetentionStats> {
    const allEvents = await this.store.query();
    const index = await this.listArchives();

    const stats = await this.store.getStats();
    const storeSize = stats.store_size_mb;

    return {
      hot_events: allEvents.length,
      archived_events: index.total_archived_events,
      archive_count: index.archives.length,
      hot_size_mb: storeSize,
      cold_size_mb: index.total_archive_size_bytes / (1024 * 1024),
      oldest_hot_event: allEvents.length > 0 ? allEvents[0].timestamp : "N/A",
      newest_archived_event:
        index.archives.length > 0
          ? index.archives[index.archives.length - 1].date_to
          : "N/A",
    };
  }

  startAutoArchive(): void {
    if (this.autoArchiveTimer) {
      clearInterval(this.autoArchiveTimer);
    }

    this.autoArchiveTimer = setInterval(async () => {
      try {
        await this.archiveOlderThan(this.archiveThresholdDays);
      } catch (err) {
        console.error("AUTO_ARCHIVE_FAILED", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, this.autoArchiveIntervalMs);

    console.log(
      `✓ Auto-archive scheduler started (every ${this.autoArchiveIntervalMs / 1000}s)`
    );
  }

  stopAutoArchive(): void {
    if (this.autoArchiveTimer) {
      clearInterval(this.autoArchiveTimer);
      this.autoArchiveTimer = null;
      console.log("✓ Auto-archive scheduler stopped");
    }
  }

  private async writeArchive(events: MemoryEvent[]): Promise<ArchiveMetadata> {
    const dateFrom = events[0].timestamp.split("T")[0];
    const dateTo = events[events.length - 1].timestamp.split("T")[0];
    const filename = this.compressionEnabled
      ? `events_${dateFrom}_to_${dateTo}.jsonl.gz`
      : `events_${dateFrom}_to_${dateTo}.jsonl`;

    const archivePath = path.join(this.archivePath, filename);

    const byType: Record<string, number> = {
      ARPS_DELTA: 0,
      PIPELINE_RUN: 0,
      AGENT_TELEMETRY: 0,
      GOVERNANCE_SIGNAL: 0,
      APR_PLAN: 0,
      CRO_RUN: 0,
    };

    let totalSize = 0;

    for (const event of events) {
      byType[event.event_type]++;
      const line = JSON.stringify(event) + "\n";
      totalSize += Buffer.byteLength(line, "utf8");
    }

    const content = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const checksum = this.computeChecksum(content);

    if (this.compressionEnabled) {
      const compressed = zlib.gzipSync(content);
      fs.writeFileSync(archivePath, compressed);
    } else {
      fs.writeFileSync(archivePath, content, "utf8");
    }

    const metadata: ArchiveMetadata = {
      filename,
      created_at: new Date().toISOString(),
      event_count: events.length,
      events_by_type: byType,
      size_bytes: fs.statSync(archivePath).size,
      date_from: dateFrom,
      date_to: dateTo,
      checksum,
      distilled: this.distillBeforeArchive,
    };

    await this.updateIndex(metadata);

    return metadata;
  }

  private async updateIndex(newArchive: ArchiveMetadata): Promise<void> {
    let index = await this.listArchives();

    index.archives.push(newArchive);
    index.last_updated = new Date().toISOString();
    index.total_archived_events += newArchive.event_count;
    index.total_archive_size_bytes += newArchive.size_bytes;

    const indexPath = path.join(this.archivePath, "archive-index.json");
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  private computeChecksum(content: string): string {
    const crypto = require("crypto");
    return "sha256:" + crypto.createHash("sha256").update(content).digest("hex");
  }
}
