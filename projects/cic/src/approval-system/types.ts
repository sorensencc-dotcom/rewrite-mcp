/**
 * Approval System Types
 * Core types for four-tier approval manifests with trust scoring and auto-promotion
 */

// Four approval tiers (safe → risky)
export type ApprovalTier = 1 | 2 | 3 | 4;

// Approval metadata
export interface ApprovalRecord {
  commandId: string; // Hash of normalized command
  command: string; // Normalized command text
  tier: ApprovalTier;
  trustScore: number; // 0-100, based on approval count and consistency
  approvalCount: number; // Total approvals received
  rejectCount: number; // Total rejections received
  firstSeen: string; // ISO 8601 timestamp
  lastApprovedAt: string; // ISO 8601 timestamp
  lastRejectedAt?: string;
  autoPromotedAt?: string; // Timestamp of last tier promotion
  reason?: string; // User-provided reason for approval
}

// Session-scoped whitelist entry (ephemeral, 1-hour TTL)
export interface SessionWhitelistEntry {
  commandId: string;
  command: string;
  addedAt: string; // ISO 8601 timestamp
  expiresAt: string; // ISO 8601 (now + 1 hour)
  reason?: string;
}

// Denylist pattern for suspicious commands
export interface DenylistPattern {
  id: string;
  pattern: string; // Regex pattern
  flags: string; // "i", "m", "g", etc.
  reason: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  matchCount: number;
}

// Complete manifest structure
export interface ApprovalManifest {
  version: string; // "2.0.0" (Phase 47)
  lastUpdated: string; // ISO 8601 timestamp
  approvals: Record<string, ApprovalRecord>;
  sessionWhitelist: Record<string, SessionWhitelistEntry>;
  denylistPatterns: DenylistPattern[];
  config: {
    autoPromoteThreshold: number; // Approvals needed to auto-promote tier
    sessionWhitelistTtlMs: number; // 1 hour = 3600000ms
    trustScoreBias: "conservative" | "moderate" | "aggressive"; // How fast to trust new commands
  };
  stats: {
    totalRequests: number;
    tier1Count: number; // Tier 1 (safe) commands
    tier2Count: number; // Tier 2 (medium) commands
    tier3Count: number; // Tier 3 (risky) commands
    tier4Count: number; // Tier 4 (critical) commands
    autoPromotedCount: number;
    rejectedCount: number;
    lastUpdated: string;
  };
}

// Approval decision result
export interface ApprovalDecision {
  approved: boolean;
  tier: ApprovalTier;
  trustScore: number;
  reason: string;
  requiresPrompt: boolean; // Tier 4 always true
  inSessionWhitelist: boolean;
  denylistMatch?: {
    pattern: DenylistPattern;
    severity: "low" | "medium" | "high";
  };
}
