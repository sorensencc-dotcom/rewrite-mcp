/**
 * Approval Handler — Integrated approval decision flow
 * Ties together: manifest, tier classifier, whitelist, denylist, auto-promotion
 */
import { ApprovalManifestManager } from "./ApprovalManifest";
import { TierClassifier } from "./TierClassifier";
import { ApprovalTier } from "./types";
export interface ApprovalRequest {
    command: string;
    reason?: string;
    sessionId?: string;
}
export interface ApprovalResult {
    command: string;
    requiresPrompt: boolean;
    tier: ApprovalTier;
    trustScore: number;
    reason: string;
    classificationReason?: string;
    denylistMatch?: {
        pattern: string;
        severity: "low" | "medium" | "high";
    };
    inSessionWhitelist?: boolean;
}
export declare class ApprovalHandler {
    private manifest;
    private classifier;
    private sessionId;
    constructor(manifest: ApprovalManifestManager, classifier: TierClassifier, sessionId?: string);
    /**
     * Evaluate a command and determine if approval prompt is needed
     */
    evaluateApproval(request: ApprovalRequest): Promise<ApprovalResult>;
    /**
     * Record user approval and trigger auto-promotion if threshold reached
     */
    recordApproval(request: ApprovalRequest): Promise<{
        promoted: boolean;
        newTier?: ApprovalTier;
        trustScore: number;
        totalApprovals: number;
    }>;
    /**
     * Record user rejection and downgrade tier if needed
     */
    recordRejection(request: ApprovalRequest): Promise<{
        downgraded: boolean;
        newTier: ApprovalTier;
        trustScore: number;
        totalRejections: number;
    }>;
    /**
     * Add command to session whitelist (1-hour ephemeral entry)
     */
    addToSessionWhitelist(request: ApprovalRequest): Promise<{
        sessionId: string;
        expiresAt: number;
        ttlMs: number;
    }>;
    /**
     * Add denylist pattern
     */
    addDenylistPattern(pattern: string, reason: string, severity: "low" | "medium" | "high"): Promise<{
        patternId: string;
        severity: string;
    }>;
    /**
     * Get tier distribution for dashboard
     */
    getTierDistribution(): {
        tier1: number;
        tier2: number;
        tier3: number;
        tier4: number;
        total: number;
    };
    /**
     * Get session whitelist status
     */
    getSessionWhitelistStatus(): {
        count: number;
        entries: Array<{
            command: string;
            expiresAt: number;
            expiresInSeconds: number;
        }>;
    };
    /**
     * Reset session (clears ephemeral whitelist)
     */
    resetSession(): void;
    private buildReasonString;
}
//# sourceMappingURL=ApprovalHandler.d.ts.map