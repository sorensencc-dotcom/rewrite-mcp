"use strict";
/**
 * Approval Manifest Tests
 * Unit tests for tier tracking, trust scoring, auto-promotion, session whitelist, denylist
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ApprovalManifest_1 = require("../src/approval-system/ApprovalManifest");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, vitest_1.describe)("ApprovalManifestManager", () => {
    let manifestManager;
    let tempDir;
    let manifestPath;
    (0, vitest_1.beforeEach)(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cic-approval-test-"));
        manifestPath = path.join(tempDir, "test-manifest.json");
        manifestManager = new ApprovalManifest_1.ApprovalManifestManager(manifestPath);
    });
    (0, vitest_1.afterEach)(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    (0, vitest_1.describe)("Load / Save", () => {
        (0, vitest_1.it)("creates empty manifest if file not found", async () => {
            await manifestManager.load();
            const manifest = manifestManager.getManifest();
            (0, vitest_1.expect)(manifest.version).toBe("2.0.0");
            (0, vitest_1.expect)(manifest.approvals).toEqual({});
            (0, vitest_1.expect)(manifest.stats.totalRequests).toBe(0);
        });
        (0, vitest_1.it)("persists manifest with atomic write", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.save();
            // Verify file exists
            const content = await fs.readFile(manifestPath, "utf-8");
            const parsed = JSON.parse(content);
            (0, vitest_1.expect)(parsed.version).toBe("2.0.0");
            (0, vitest_1.expect)(Object.keys(parsed.approvals).length).toBe(1);
        });
        (0, vitest_1.it)("loads existing manifest on subsequent calls", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.save();
            // Create new instance and load
            const manager2 = new ApprovalManifest_1.ApprovalManifestManager(manifestPath);
            await manager2.load();
            const manifest = manager2.getManifest();
            (0, vitest_1.expect)(Object.keys(manifest.approvals).length).toBe(1);
        });
    });
    (0, vitest_1.describe)("Approval Recording", () => {
        (0, vitest_1.it)("records first approval for new command", async () => {
            await manifestManager.load();
            const result = await manifestManager.recordApproval("npm run build");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record).toBeDefined();
            (0, vitest_1.expect)(record?.approvalCount).toBe(1);
            (0, vitest_1.expect)(record?.rejectCount).toBe(0);
            (0, vitest_1.expect)(record?.tier).toBe(1);
            (0, vitest_1.expect)(result.promoted).toBe(false);
        });
        (0, vitest_1.it)("increments approval count on subsequent approvals", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.approvalCount).toBe(2);
        });
        (0, vitest_1.it)("auto-promotes to tier 2 after 3 approvals", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            const result = await manifestManager.recordApproval("npm run build");
            (0, vitest_1.expect)(result.promoted).toBe(true);
            (0, vitest_1.expect)(result.newTier).toBe(2);
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.tier).toBe(2);
            (0, vitest_1.expect)(record?.autoPromotedAt).toBeDefined();
        });
        (0, vitest_1.it)("continues auto-promoting: tier 2→3→4", async () => {
            await manifestManager.load();
            // Tier 1→2 at 3 approvals
            for (let i = 0; i < 3; i++) {
                await manifestManager.recordApproval("npm run test");
            }
            let record = manifestManager.getApprovalRecord("npm run test");
            (0, vitest_1.expect)(record?.tier).toBe(2);
            // Tier 2→3 at 6 approvals
            for (let i = 0; i < 3; i++) {
                await manifestManager.recordApproval("npm run test");
            }
            record = manifestManager.getApprovalRecord("npm run test");
            (0, vitest_1.expect)(record?.tier).toBe(3);
            // Tier 3→4 at 9 approvals
            for (let i = 0; i < 3; i++) {
                await manifestManager.recordApproval("npm run test");
            }
            record = manifestManager.getApprovalRecord("npm run test");
            (0, vitest_1.expect)(record?.tier).toBe(4);
        });
        (0, vitest_1.it)("caps tier at 4 (no tier 5)", async () => {
            await manifestManager.load();
            // Get to tier 4
            for (let i = 0; i < 9; i++) {
                await manifestManager.recordApproval("npm run build");
            }
            // Try to go beyond tier 4
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.tier).toBe(4);
            (0, vitest_1.expect)(record?.approvalCount).toBe(12);
        });
        (0, vitest_1.it)("computes trust score from approval/rejection ratio", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.trustScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(record?.trustScore).toBeLessThanOrEqual(100);
        });
    });
    (0, vitest_1.describe)("Rejection Recording", () => {
        (0, vitest_1.it)("records rejection and increments reject count", async () => {
            await manifestManager.load();
            await manifestManager.recordRejection("npm run build");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.rejectCount).toBe(1);
            (0, vitest_1.expect)(record?.lastRejectedAt).toBeDefined();
            (0, vitest_1.expect)(manifestManager.getManifest().stats.rejectedCount).toBe(1);
        });
        (0, vitest_1.it)("reduces trust score when rejections increase", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("npm run build");
            let record = manifestManager.getApprovalRecord("npm run build");
            const scoreAfterApprovals = record?.trustScore ?? 0;
            await manifestManager.recordRejection("npm run build");
            record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.trustScore).toBeLessThan(scoreAfterApprovals);
        });
    });
    (0, vitest_1.describe)("Session Whitelist", () => {
        (0, vitest_1.it)("adds command to session whitelist", async () => {
            await manifestManager.load();
            await manifestManager.addToSessionWhitelist("npm run build");
            const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
            (0, vitest_1.expect)(isWhitelisted).toBe(true);
        });
        (0, vitest_1.it)("returns false for commands not in whitelist", async () => {
            await manifestManager.load();
            const isWhitelisted = manifestManager.isInSessionWhitelist("npm run deploy");
            (0, vitest_1.expect)(isWhitelisted).toBe(false);
        });
        (0, vitest_1.it)("removes expired whitelist entries", async () => {
            await manifestManager.load();
            // Mock the entry to have expired
            const manifest = manifestManager.getManifest();
            const commandId = "test";
            manifest.sessionWhitelist[commandId] = {
                commandId,
                command: "npm run build",
                addedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            };
            const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
            (0, vitest_1.expect)(isWhitelisted).toBe(false);
        });
        (0, vitest_1.it)("session whitelist expires after 1 hour", async () => {
            await manifestManager.load();
            await manifestManager.addToSessionWhitelist("npm run build");
            // Manually expire the entry by setting expiresAt to past
            const manifest = manifestManager.getManifest();
            const entries = Object.values(manifest.sessionWhitelist);
            if (entries.length > 0) {
                entries[0].expiresAt = new Date(Date.now() - 1000).toISOString();
            }
            const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
            (0, vitest_1.expect)(isWhitelisted).toBe(false);
        });
    });
    (0, vitest_1.describe)("Denylist Patterns", () => {
        (0, vitest_1.it)("adds denylist pattern", async () => {
            await manifestManager.load();
            await manifestManager.addDenylistPattern("^rm\\s+-rf", "Recursive deletion", "high");
            const manifest = manifestManager.getManifest();
            (0, vitest_1.expect)(manifest.denylistPatterns.length).toBe(1);
            (0, vitest_1.expect)(manifest.denylistPatterns[0].reason).toBe("Recursive deletion");
        });
        (0, vitest_1.it)("blocks commands matching denylist", async () => {
            await manifestManager.load();
            await manifestManager.addDenylistPattern("^rm\\s+-rf", "Recursive deletion", "high");
            const decision = manifestManager.getApprovalDecision("rm -rf /");
            (0, vitest_1.expect)(decision.approved).toBe(false);
            (0, vitest_1.expect)(decision.denylistMatch).toBeDefined();
            (0, vitest_1.expect)(decision.denylistMatch?.severity).toBe("high");
        });
        (0, vitest_1.it)("allows commands not matching denylist", async () => {
            await manifestManager.load();
            await manifestManager.addDenylistPattern("^rm\\s+-rf", "Recursive deletion", "high");
            const decision = manifestManager.getApprovalDecision("npm run build");
            (0, vitest_1.expect)(decision.approved).toBe(true);
            (0, vitest_1.expect)(decision.denylistMatch).toBeUndefined();
        });
        (0, vitest_1.it)("ignores low-severity denylist matches", async () => {
            await manifestManager.load();
            await manifestManager.addDenylistPattern("debug", "Debug mode", "low");
            const decision = manifestManager.getApprovalDecision("npm run debug");
            (0, vitest_1.expect)(decision.approved).toBe(true); // Low severity doesn't block
            (0, vitest_1.expect)(decision.denylistMatch).toBeDefined();
        });
    });
    (0, vitest_1.describe)("Approval Decisions", () => {
        (0, vitest_1.it)("tier 1 commands approved without prompt", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            const decision = manifestManager.getApprovalDecision("npm run build");
            (0, vitest_1.expect)(decision.approved).toBe(true);
            (0, vitest_1.expect)(decision.requiresPrompt).toBe(false);
            (0, vitest_1.expect)(decision.tier).toBe(1);
        });
        (0, vitest_1.it)("tier 4 commands require prompt", async () => {
            await manifestManager.load();
            // Manually set a command to tier 4
            const manifest = manifestManager.getManifest();
            const commandId = Object.keys(manifest.approvals)[0];
            if (commandId) {
                manifest.approvals[commandId].tier = 4;
            }
            // Or add a new tier 4 via rejection
            await manifestManager.recordRejection("npm run deploy");
            const tier4Record = manifestManager.getApprovalRecord("npm run deploy");
            (0, vitest_1.expect)(tier4Record?.tier).toBe(4);
            const decision = manifestManager.getApprovalDecision("npm run deploy");
            (0, vitest_1.expect)(decision.requiresPrompt).toBe(true);
        });
        (0, vitest_1.it)("new commands (no approval record) are tier 1", async () => {
            await manifestManager.load();
            const decision = manifestManager.getApprovalDecision("npm run new-cmd");
            (0, vitest_1.expect)(decision.approved).toBe(true);
            (0, vitest_1.expect)(decision.tier).toBe(1);
            (0, vitest_1.expect)(decision.requiresPrompt).toBe(false);
        });
        (0, vitest_1.it)("session whitelist overrides tier", async () => {
            await manifestManager.load();
            await manifestManager.recordRejection("npm run deploy");
            // Tier 4 would require prompt
            let decision = manifestManager.getApprovalDecision("npm run deploy");
            (0, vitest_1.expect)(decision.requiresPrompt).toBe(true);
            // Add to session whitelist
            await manifestManager.addToSessionWhitelist("npm run deploy");
            decision = manifestManager.getApprovalDecision("npm run deploy");
            (0, vitest_1.expect)(decision.requiresPrompt).toBe(false);
            (0, vitest_1.expect)(decision.inSessionWhitelist).toBe(true);
        });
        (0, vitest_1.it)("denylist blocks even whitelisted commands", async () => {
            await manifestManager.load();
            await manifestManager.addDenylistPattern("rm\\s+-rf", "Dangerous", "high");
            await manifestManager.addToSessionWhitelist("rm -rf /tmp");
            const decision = manifestManager.getApprovalDecision("rm -rf /tmp");
            (0, vitest_1.expect)(decision.approved).toBe(false);
            (0, vitest_1.expect)(decision.denylistMatch).toBeDefined();
        });
    });
    (0, vitest_1.describe)("Query Methods", () => {
        (0, vitest_1.it)("lists all tier 4 commands", async () => {
            await manifestManager.load();
            await manifestManager.recordRejection("npm run deploy");
            await manifestManager.recordRejection("npm run release");
            const tier4 = manifestManager.listTier4Commands();
            (0, vitest_1.expect)(tier4.length).toBeGreaterThanOrEqual(2);
            tier4.forEach((r) => (0, vitest_1.expect)(r.tier).toBe(4));
        });
        (0, vitest_1.it)("lists recently auto-promoted commands", async () => {
            await manifestManager.load();
            // Promote a command
            for (let i = 0; i < 3; i++) {
                await manifestManager.recordApproval("npm run build");
            }
            const promoted = manifestManager.listAutoPromotedCommands(3600000); // Last hour
            (0, vitest_1.expect)(promoted.length).toBeGreaterThan(0);
            promoted.forEach((r) => (0, vitest_1.expect)(r.autoPromotedAt).toBeDefined());
        });
    });
    (0, vitest_1.describe)("Normalization", () => {
        (0, vitest_1.it)("normalizes commands to stable IDs", async () => {
            await manifestManager.load();
            // Same command with different whitespace
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("  npm run build  ");
            // Should be same record
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.approvalCount).toBe(2);
        });
        (0, vitest_1.it)("case-insensitive command matching", async () => {
            await manifestManager.load();
            await manifestManager.recordApproval("npm run build");
            await manifestManager.recordApproval("NPM RUN BUILD");
            const record = manifestManager.getApprovalRecord("npm run build");
            (0, vitest_1.expect)(record?.approvalCount).toBe(2);
        });
    });
});
//# sourceMappingURL=approval-manifest.test.js.map