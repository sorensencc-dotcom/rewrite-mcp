export type CrawlErrorCode =
  | 'TIMEOUT'
  | 'ROBOTS_BLOCKED'
  | 'NETWORK_ERROR'
  | 'STATUS_ERROR';

export interface CrawlResult {
  url: string;
  status: number;
  redirectChain: string[];
  robotsAllowed: boolean;
  capturedAt: string;
  errorCode?: CrawlErrorCode;
}

export interface QueueEntry {
  url: string;
  /** 0–100; higher = dequeued first. Maps to LeadScore (A≥80, B≥60, C≥40, D≥0). */
  priority: number;
  addedAt: string;
}

export interface CrawlOptions {
  /** Fetch timeout in ms. Default 30_000. */
  timeout?: number;
  /** Max retries on failure. Default 2. */
  retries?: number;
  /** Min ms between requests to the same domain. Default 2_000. */
  politenessMs?: number;
  /** User-Agent header. Default 'RewriteLabsBot/1.0'. */
  userAgent?: string;
}
