/**
 * ApprovalManifest — Persistent approval history with tier tracking and auto-promotion
 * Reads from / writes to CIC_APPROVAL_MANIFEST path (default: skills-runtime/approvals-manifest.json)
 * Atomic writes: write to .tmp, then atomic rename
 */
import { ApprovalManifest, ApprovalRecord, ApprovalDecision, ApprovalTier } from "./types";
export declare class ApprovalManifestManager {
    private manifest;
    private manifestPath;
    constructor(manifestPath?: string);
    private createEmpty;
    load(): Promise<void>;
    save(): Promise<void>;
    /**
     * Record an approval for a command
     * Returns true if command was auto-promoted to next tier
     */
    recordApproval(command: string, reason?: string): Promise<{
        promoted: boolean;
        newTier?: ApprovalTier;
    }>;
    /**
     * Record a rejection for a command
     */
    recordRejection(command: string): Promise<void>;
    /**
     * Add command to session whitelist (ephemeral, 1-hour TTL)
     */
    addToSessionWhitelist(command: string, reason?: string): Promise<void>;
    /**
     * Check if command is in session whitelist (and not expired)
     */
    isInSessionWhitelist(command: string): boolean;
    /**
     * Get approval decision for a command
     */
    getApprovalDecision(command: string): ApprovalDecision;
    /**
     * Add a denylist pattern
     */
    addDenylistPattern(pattern: string, reason: string, severity?: "low" | "medium" | "high"): Promise<void>;
    /**
     * Check if command matches any denylist pattern
     */
    private checkDenylist;
    /**
     * Compute trust score (0-100) based on approval/rejection ratio
     */
    private computeTrustScore;
    /**
     * Normalize command to stable ID
     */
    private normalizeCommandId;
    /**
     * Clean expired session whitelist entries
     */
    private cleanExpiredSessionWhitelist;
    /**
     * Update tier counts in stats
     */
    private updateStats;
    /**
     * Get manifest for inspection (read-only)
     */
    getManifest(): Readonly<ApprovalManifest>;
    /**
     * Get approval record for a command (or undefined)
     */
    getApprovalRecord(command: string): ApprovalRecord | undefined;
    /**
     * List all Tier 4 commands (always-prompt)
     */
    listTier4Commands(): ApprovalRecord[];
    /**
     * List all commands recently auto-promoted
     */
    listAutoPromotedCommands(sinceMs?: number): ApprovalRecord[];
}
export declare const approvalManifest: ApprovalManifestManager;
