/**
 * Approval System Types
 * Core types for four-tier approval manifests with trust scoring and auto-promotion
 */
export type ApprovalTier = 1 | 2 | 3 | 4;
export interface ApprovalRecord {
    commandId: string;
    command: string;
    tier: ApprovalTier;
    trustScore: number;
    approvalCount: number;
    rejectCount: number;
    firstSeen: string;
    lastApprovedAt: string;
    lastRejectedAt?: string;
    autoPromotedAt?: string;
    reason?: string;
}
export interface SessionWhitelistEntry {
    commandId: string;
    command: string;
    addedAt: string;
    expiresAt: string;
    reason?: string;
}
export interface DenylistPattern {
    id: string;
    pattern: string;
    flags: string;
    reason: string;
    severity: "low" | "medium" | "high";
    createdAt: string;
    matchCount: number;
}
export interface ApprovalManifest {
    version: string;
    lastUpdated: string;
    approvals: Record<string, ApprovalRecord>;
    sessionWhitelist: Record<string, SessionWhitelistEntry>;
    denylistPatterns: DenylistPattern[];
    config: {
        autoPromoteThreshold: number;
        sessionWhitelistTtlMs: number;
        trustScoreBias: "conservative" | "moderate" | "aggressive";
    };
    stats: {
        totalRequests: number;
        tier1Count: number;
        tier2Count: number;
        tier3Count: number;
        tier4Count: number;
        autoPromotedCount: number;
        rejectedCount: number;
        lastUpdated: string;
    };
}
export interface ApprovalDecision {
    approved: boolean;
    tier: ApprovalTier;
    trustScore: number;
    reason: string;
    requiresPrompt: boolean;
    inSessionWhitelist: boolean;
    denylistMatch?: {
        pattern: DenylistPattern;
        severity: "low" | "medium" | "high";
    };
}
//# sourceMappingURL=types.d.ts.map