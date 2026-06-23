/**
 * ApprovalManifest — Persistent approval history with tier tracking and auto-promotion
 * Reads from / writes to CIC_APPROVAL_MANIFEST path (default: skills-runtime/approvals-manifest.json)
 * Atomic writes: write to .tmp, then atomic rename
 */
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
const DEFAULT_MANIFEST_PATH = process.env.CIC_APPROVAL_MANIFEST ||
    "skills-runtime/approvals-manifest.json";
const DEFAULT_CONFIG = {
    autoPromoteThreshold: 3, // Auto-promote after 3 consecutive approvals in a tier
    sessionWhitelistTtlMs: 3600000, // 1 hour
    trustScoreBias: "moderate",
};
export class ApprovalManifestManager {
    constructor(manifestPath = DEFAULT_MANIFEST_PATH) {
        this.manifestPath = manifestPath;
        this.manifest = this.createEmpty();
    }
    createEmpty() {
        return {
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
            approvals: {},
            sessionWhitelist: {},
            denylistPatterns: [],
            config: DEFAULT_CONFIG,
            stats: {
                totalRequests: 0,
                tier1Count: 0,
                tier2Count: 0,
                tier3Count: 0,
                tier4Count: 0,
                autoPromotedCount: 0,
                rejectedCount: 0,
                lastUpdated: new Date().toISOString(),
            },
        };
    }
    async load() {
        try {
            const content = await fs.readFile(this.manifestPath, "utf-8");
            const parsed = JSON.parse(content);
            // Validate version
            if (parsed.version !== "2.0.0") {
                console.warn(`[ApprovalManifest] Version mismatch: ${parsed.version} vs 2.0.0`);
            }
            this.manifest = {
                ...parsed,
                lastUpdated: new Date().toISOString(),
            };
            // Clean expired session whitelist entries
            this.cleanExpiredSessionWhitelist();
        }
        catch (err) {
            if (err.code === "ENOENT") {
                console.log(`[ApprovalManifest] Creating new manifest at ${this.manifestPath}`);
                await this.save();
            }
            else {
                throw err;
            }
        }
    }
    async save() {
        const tmpPath = `${this.manifestPath}.tmp`;
        const now = new Date().toISOString();
        // Update timestamps and stats
        this.manifest.lastUpdated = now;
        this.manifest.stats.lastUpdated = now;
        this.updateStats();
        // Ensure directory exists
        const dir = path.dirname(this.manifestPath);
        await fs.mkdir(dir, { recursive: true });
        // Atomic write: write to .tmp, then rename
        const content = JSON.stringify(this.manifest, null, 2);
        await fs.writeFile(tmpPath, content, "utf-8");
        try {
            await fs.rename(tmpPath, this.manifestPath);
        }
        catch (err) {
            // On Windows, rename fails if dest exists; use unlink + rename
            if (err.code === "EEXIST") {
                await fs.unlink(this.manifestPath);
                await fs.rename(tmpPath, this.manifestPath);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Record an approval for a command
     * Returns true if command was auto-promoted to next tier
     */
    async recordApproval(command, reason) {
        const commandId = this.normalizeCommandId(command);
        const now = new Date().toISOString();
        let record = this.manifest.approvals[commandId];
        if (!record) {
            record = {
                commandId,
                command,
                tier: 1,
                trustScore: this.computeTrustScore(1, 1, 0),
                approvalCount: 1,
                rejectCount: 0,
                firstSeen: now,
                lastApprovedAt: now,
                reason,
            };
        }
        else {
            record.approvalCount++;
            record.lastApprovedAt = now;
            record.trustScore = this.computeTrustScore(record.tier, record.approvalCount, record.rejectCount);
        }
        // Check auto-promotion: N consecutive approvals in same tier
        let promoted = false;
        let newTier;
        if (record.approvalCount % DEFAULT_CONFIG.autoPromoteThreshold === 0 &&
            record.tier < 4) {
            newTier = (record.tier + 1);
            record.tier = newTier;
            record.autoPromotedAt = now;
            promoted = true;
            this.manifest.stats.autoPromotedCount++;
        }
        this.manifest.approvals[commandId] = record;
        await this.save();
        return { promoted, newTier };
    }
    /**
     * Record a rejection for a command
     */
    async recordRejection(command) {
        const commandId = this.normalizeCommandId(command);
        const now = new Date().toISOString();
        let record = this.manifest.approvals[commandId];
        if (!record) {
            record = {
                commandId,
                command,
                tier: 4, // Start at highest tier if rejected early
                trustScore: 0,
                approvalCount: 0,
                rejectCount: 1,
                firstSeen: now,
                lastApprovedAt: now,
                lastRejectedAt: now,
            };
        }
        else {
            record.rejectCount++;
            record.lastRejectedAt = now;
            record.trustScore = this.computeTrustScore(record.tier, record.approvalCount, record.rejectCount);
        }
        this.manifest.approvals[commandId] = record;
        this.manifest.stats.rejectedCount++;
        await this.save();
    }
    /**
     * Add command to session whitelist (ephemeral, 1-hour TTL)
     */
    async addToSessionWhitelist(command, reason) {
        const commandId = this.normalizeCommandId(command);
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + DEFAULT_CONFIG.sessionWhitelistTtlMs).toISOString();
        this.manifest.sessionWhitelist[commandId] = {
            commandId,
            command,
            addedAt: now,
            expiresAt,
            reason,
        };
        await this.save();
    }
    /**
     * Check if command is in session whitelist (and not expired)
     */
    isInSessionWhitelist(command) {
        const commandId = this.normalizeCommandId(command);
        const entry = this.manifest.sessionWhitelist[commandId];
        if (!entry)
            return false;
        const isExpired = new Date(entry.expiresAt) < new Date();
        if (isExpired) {
            delete this.manifest.sessionWhitelist[commandId];
            return false;
        }
        return true;
    }
    /**
     * Get approval decision for a command
     */
    getApprovalDecision(command) {
        const commandId = this.normalizeCommandId(command);
        const record = this.manifest.approvals[commandId];
        // Check denylist first (blocks if medium/high severity)
        const denylistMatch = this.checkDenylist(command);
        if (denylistMatch && denylistMatch.severity !== "low") {
            return {
                approved: false,
                tier: 4,
                trustScore: 0,
                reason: `Matches denylist pattern: ${denylistMatch.pattern.reason}`,
                requiresPrompt: true,
                inSessionWhitelist: false,
                denylistMatch,
            };
        }
        // Check session whitelist
        const inSessionWhitelist = this.isInSessionWhitelist(command);
        if (inSessionWhitelist) {
            return {
                approved: true,
                tier: record?.tier ?? 1,
                trustScore: record?.trustScore ?? 100,
                reason: "In session whitelist",
                requiresPrompt: false,
                inSessionWhitelist: true,
                denylistMatch: denylistMatch || undefined, // Include low-severity matches for logging
            };
        }
        // If no approval record, treat as Tier 1 (safe)
        if (!record) {
            return {
                approved: true,
                tier: 1,
                trustScore: 0,
                reason: "New command, assuming safe tier",
                requiresPrompt: false,
                inSessionWhitelist: false,
                denylistMatch: denylistMatch || undefined,
            };
        }
        // Tier-based approval: Tier 4 always requires prompt
        const requiresPrompt = record.tier === 4;
        return {
            approved: !requiresPrompt,
            tier: record.tier,
            trustScore: record.trustScore,
            reason: `Tier ${record.tier} command (${record.approvalCount} approvals)`,
            requiresPrompt,
            inSessionWhitelist: false,
            denylistMatch: denylistMatch || undefined,
        };
    }
    /**
     * Add a denylist pattern
     */
    async addDenylistPattern(pattern, reason, severity = "medium") {
        const id = crypto.randomUUID();
        this.manifest.denylistPatterns.push({
            id,
            pattern,
            flags: "i",
            reason,
            severity,
            createdAt: new Date().toISOString(),
            matchCount: 0,
        });
        await this.save();
    }
    /**
     * Check if command matches any denylist pattern
     */
    checkDenylist(command) {
        for (const pattern of this.manifest.denylistPatterns) {
            try {
                const regex = new RegExp(pattern.pattern, pattern.flags);
                if (regex.test(command)) {
                    pattern.matchCount++;
                    return { pattern, severity: pattern.severity };
                }
            }
            catch (err) {
                console.error(`[ApprovalManifest] Invalid denylist regex: ${pattern.pattern}`);
            }
        }
        return null;
    }
    /**
     * Compute trust score (0-100) based on approval/rejection ratio
     */
    computeTrustScore(tier, approvalCount, rejectCount) {
        const total = approvalCount + rejectCount;
        if (total === 0)
            return 0;
        const ratio = approvalCount / total;
        const bias = this.manifest.config.trustScoreBias;
        const biasMultiplier = bias === "conservative"
            ? 0.8
            : bias === "aggressive"
                ? 1.2
                : 1.0;
        return Math.min(100, Math.floor(ratio * 100 * biasMultiplier));
    }
    /**
     * Normalize command to stable ID
     */
    normalizeCommandId(command) {
        // Normalize: trim, lowercase, hash for stable ID
        const normalized = command.trim().toLowerCase();
        return crypto.createHash("sha256").update(normalized).digest("hex");
    }
    /**
     * Clean expired session whitelist entries
     */
    cleanExpiredSessionWhitelist() {
        const now = new Date();
        const toDelete = [];
        for (const [id, entry] of Object.entries(this.manifest.sessionWhitelist)) {
            if (new Date(entry.expiresAt) < now) {
                toDelete.push(id);
            }
        }
        toDelete.forEach((id) => delete this.manifest.sessionWhitelist[id]);
    }
    /**
     * Update tier counts in stats
     */
    updateStats() {
        const stats = this.manifest.stats;
        stats.tier1Count = 0;
        stats.tier2Count = 0;
        stats.tier3Count = 0;
        stats.tier4Count = 0;
        for (const record of Object.values(this.manifest.approvals)) {
            if (record.tier === 1)
                stats.tier1Count++;
            else if (record.tier === 2)
                stats.tier2Count++;
            else if (record.tier === 3)
                stats.tier3Count++;
            else if (record.tier === 4)
                stats.tier4Count++;
        }
        stats.totalRequests = Object.keys(this.manifest.approvals).length;
    }
    /**
     * Get manifest for inspection (read-only)
     */
    getManifest() {
        return this.manifest;
    }
    /**
     * Get approval record for a command (or undefined)
     */
    getApprovalRecord(command) {
        const commandId = this.normalizeCommandId(command);
        return this.manifest.approvals[commandId];
    }
    /**
     * List all Tier 4 commands (always-prompt)
     */
    listTier4Commands() {
        return Object.values(this.manifest.approvals).filter((r) => r.tier === 4);
    }
    /**
     * List all commands recently auto-promoted
     */
    listAutoPromotedCommands(sinceMs = 3600000) {
        const sinceTime = new Date(Date.now() - sinceMs);
        return Object.values(this.manifest.approvals).filter((r) => r.autoPromotedAt &&
            new Date(r.autoPromotedAt) > sinceTime);
    }
}
// Singleton instance
export const approvalManifest = new ApprovalManifestManager();
//# sourceMappingURL=ApprovalManifest.js.map