"use strict";
/**
 * Approval Handler — Integrated approval decision flow
 * Ties together: manifest, tier classifier, whitelist, denylist, auto-promotion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalHandler = void 0;
class ApprovalHandler {
    constructor(manifest, classifier, sessionId = "default") {
        this.manifest = manifest;
        this.classifier = classifier;
        this.sessionId = sessionId;
    }
    /**
     * Evaluate a command and determine if approval prompt is needed
     */
    async evaluateApproval(request) {
        const { command } = request;
        // Check session whitelist first (fastest path)
        const inSessionWhitelist = this.manifest.isInSessionWhitelist(command);
        if (inSessionWhitelist) {
            const record = this.manifest.getApprovalRecord(command);
            return {
                command,
                requiresPrompt: false,
                tier: record?.tier || 1,
                trustScore: record?.trustScore || 0,
                reason: "In session whitelist (1-hour TTL)",
                inSessionWhitelist: true,
            };
        }
        // Get approval decision from manifest (includes denylist check, tier logic)
        const decision = this.manifest.getApprovalDecision(command);
        const record = this.manifest.getApprovalRecord(command);
        // Get tier classification for unknown commands
        let classificationReason;
        let tier = decision.tier;
        let requiresPrompt = decision.requiresPrompt;
        if (!record) {
            const classification = this.classifier.classify(command);
            classificationReason = classification.reason;
            tier = classification.tier;
            // For unknown commands, require prompt if Tier 3 or 4
            requiresPrompt = tier >= 3;
        }
        return {
            command,
            requiresPrompt: requiresPrompt || decision.denylistMatch?.severity === "high" || decision.denylistMatch?.severity === "medium",
            tier,
            trustScore: decision.trustScore,
            reason: this.buildReasonString(decision),
            classificationReason,
            denylistMatch: decision.denylistMatch ? {
                pattern: decision.denylistMatch.pattern.pattern,
                severity: decision.denylistMatch.severity,
            } : undefined,
            inSessionWhitelist: false,
        };
    }
    /**
     * Record user approval and trigger auto-promotion if threshold reached
     */
    async recordApproval(request) {
        const { command, reason } = request;
        const result = await this.manifest.recordApproval(command, reason);
        const record = this.manifest.getApprovalRecord(command);
        return {
            promoted: result.promoted,
            newTier: result.newTier,
            trustScore: record?.trustScore || 0,
            totalApprovals: record?.approvalCount || 1,
        };
    }
    /**
     * Record user rejection and downgrade tier if needed
     */
    async recordRejection(request) {
        const { command } = request;
        await this.manifest.recordRejection(command);
        const record = this.manifest.getApprovalRecord(command);
        return {
            downgraded: record?.tier === 4,
            newTier: record?.tier || 4,
            trustScore: record?.trustScore || 0,
            totalRejections: record?.rejectCount || 1,
        };
    }
    /**
     * Add command to session whitelist (1-hour ephemeral entry)
     */
    async addToSessionWhitelist(request) {
        const { command, reason } = request;
        await this.manifest.addToSessionWhitelist(command, reason);
        const ttlMs = 3600000; // 1 hour
        const expiresAt = Date.now() + ttlMs;
        return {
            sessionId: this.sessionId,
            expiresAt,
            ttlMs,
        };
    }
    /**
     * Add denylist pattern
     */
    async addDenylistPattern(pattern, reason, severity) {
        await this.manifest.addDenylistPattern(pattern, reason, severity);
        // Get the last added pattern
        const manifest = this.manifest.getManifest();
        const lastPattern = manifest.denylistPatterns[manifest.denylistPatterns.length - 1];
        return {
            patternId: lastPattern?.id || "",
            severity: lastPattern?.severity || severity,
        };
    }
    /**
     * Get tier distribution for dashboard
     */
    getTierDistribution() {
        const manifest = this.manifest.getManifest();
        return {
            tier1: manifest.stats.tier1Count,
            tier2: manifest.stats.tier2Count,
            tier3: manifest.stats.tier3Count,
            tier4: manifest.stats.tier4Count,
            total: manifest.stats.totalRequests,
        };
    }
    /**
     * Get session whitelist status
     */
    getSessionWhitelistStatus() {
        const manifest = this.manifest.getManifest();
        const now = Date.now();
        const entries = Object.values(manifest.sessionWhitelist)
            .filter((e) => new Date(e.expiresAt) > new Date(now))
            .map((e) => ({
            command: e.command,
            expiresAt: new Date(e.expiresAt).getTime(),
            expiresInSeconds: Math.max(0, (new Date(e.expiresAt).getTime() - now) / 1000),
        }));
        return {
            count: entries.length,
            entries,
        };
    }
    /**
     * Reset session (clears ephemeral whitelist)
     */
    resetSession() {
        // Sessions expire naturally; this just acknowledges the session is ending
        // In a real system, this might trigger cleanup of old entries
    }
    buildReasonString(decision) {
        if (decision.denylistMatch) {
            const severity = decision.denylistMatch.severity;
            if (severity === "high" || severity === "medium") {
                return `Blocked by ${severity}-severity denylist pattern`;
            }
            return `Matched ${severity}-severity denylist pattern (logged)`;
        }
        switch (decision.tier) {
            case 1:
                return "Tier 1 — Safe (no prompt required)";
            case 2:
                return "Tier 2 — Moderate risk (brief review recommended)";
            case 3:
                return "Tier 3 — Risky (review recommended)";
            case 4:
                return "Tier 4 — Critical (always prompt)";
            default:
                return "Unknown tier";
        }
    }
}
exports.ApprovalHandler = ApprovalHandler;
//# sourceMappingURL=ApprovalHandler.js.map