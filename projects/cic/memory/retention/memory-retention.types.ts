export type DistillationStrategy =
  | "aggregate"
  | "keep_first_last"
  | "keep_all"
  | "daily_summary"
  | "group_summary";

export interface ArchiveMetadata {
  filename: string;
  created_at: string;
  event_count: number;
  events_by_type: Record<string, number>;
  size_bytes: number;
  date_from: string;
  date_to: string;
  checksum: string;
  distilled: boolean;
}

export interface ArchiveIndex {
  version: 1;
  last_updated: string;
  archives: ArchiveMetadata[];
  total_archived_events: number;
  total_archive_size_bytes: number;
}

export interface DistillationRule {
  eventType: string;
  strategy: DistillationStrategy;
  retentionDays: number;
  keepRatio?: number;
  groupByField?: string;
}

export interface DistilledEvent {
  original_count: number;
  summarized_at: string;
  summary: {
    [key: string]: any;
  };
}

export interface RetentionStats {
  hot_events: number;
  archived_events: number;
  archive_count: number;
  hot_size_mb: number;
  cold_size_mb: number;
  oldest_hot_event: string;
  newest_archived_event: string;
}

export interface RetentionOptions {
  archivePath?: string;
  archiveThresholdDays?: number;
  distillBeforeArchive?: boolean;
  compressionEnabled?: boolean;
  autoArchiveIntervalMs?: number;
}
