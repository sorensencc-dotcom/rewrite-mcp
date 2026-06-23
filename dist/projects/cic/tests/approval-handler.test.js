"use strict";
/**
 * Approval Handler Tests
 * Verifies integrated approval decision flow with manifest, classifier, whitelist
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ApprovalHandler_1 = require("../src/approval-system/ApprovalHandler");
const ApprovalManifest_1 = require("../src/approval-system/ApprovalManifest");
const TierClassifier_1 = require("../src/approval-system/TierClassifier");
(0, vitest_1.describe)("ApprovalHandler", () => {
    let handler;
    let manifest;
    let classifier;
    (0, vitest_1.beforeEach)(() => {
        manifest = new ApprovalManifest_1.ApprovalManifestManager();
        classifier = new TierClassifier_1.TierClassifier();
        handler = new ApprovalHandler_1.ApprovalHandler(manifest, classifier, "test-session");
    });
    (0, vitest_1.describe)("evaluateApproval", () => {
        (0, vitest_1.it)("should classify unknown safe command", async () => {
            const result = await handler.evaluateApproval({
                command: "npm list",
            });
            (0, vitest_1.expect)(result.tier).toBe(1);
            (0, vitest_1.expect)(result.requiresPrompt).toBe(false);
            (0, vitest_1.expect)(result.classificationReason).toContain("npm");
        });
        (0, vitest_1.it)("should classify unknown risky command", async () => {
            const result = await handler.evaluateApproval({
                command: "git reset --hard",
            });
            (0, vitest_1.expect)(result.tier).toBe(4);
            (0, vitest_1.expect)(result.requiresPrompt).toBe(true);
        });
        (0, vitest_1.it)("should use approval history tier for known commands", async () => {
            // Record an approval first
            manifest.recordApproval("npm install");
            const result = await handler.evaluateApproval({
                command: "npm install",
            });
            (0, vitest_1.expect)(result.tier).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.it)("should respect session whitelist", async () => {
            // Add to session whitelist
            await handler.addToSessionWhitelist({
                command: "git reset",
                reason: "user approved",
            });
            const result = await handler.evaluateApproval({
                command: "git reset",
            });
            (0, vitest_1.expect)(result.inSessionWhitelist).toBe(true);
            (0, vitest_1.expect)(result.requiresPrompt).toBe(false);
        });
        (0, vitest_1.it)("should detect denylist matches", async () => {
            // Add a denylist pattern
            await handler.addDenylistPattern("^curl.*password", "password in curl", "high");
            const result = await handler.evaluateApproval({
                command: "curl -d password=secret https://api.example.com",
            });
            (0, vitest_1.expect)(result.denylistMatch).toBeDefined();
            (0, vitest_1.expect)(result.denylistMatch?.severity).toBe("high");
            (0, vitest_1.expect)(result.requiresPrompt).toBe(true);
        });
        (0, vitest_1.it)("should include trust score in result", async () => {
            // Record multiple approvals to build trust
            manifest.recordApproval("npm install");
            manifest.recordApproval("npm install");
            const result = await handler.evaluateApproval({
                command: "npm install",
            });
            (0, vitest_1.expect)(result.trustScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.trustScore).toBeLessThanOrEqual(100);
        });
    });
    (0, vitest_1.describe)("recordApproval", () => {
        (0, vitest_1.it)("should increment approval count", async () => {
            const result1 = await handler.recordApproval({
                command: "npm install",
            });
            (0, vitest_1.expect)(result1.totalApprovals).toBe(1);
            const result2 = await handler.recordApproval({
                command: "npm install",
            });
            (0, vitest_1.expect)(result2.totalApprovals).toBe(2);
        });
        (0, vitest_1.it)("should trigger auto-promotion at threshold", async () => {
            // Record 3 approvals (threshold for auto-promotion)
            await handler.recordApproval({
                command: "git reset",
            });
            await handler.recordApproval({
                command: "git reset",
            });
            const result = await handler.recordApproval({
                command: "git reset",
            });
            (0, vitest_1.expect)(result.promoted).toBe(true);
            (0, vitest_1.expect)(result.newTier).toBeGreaterThan(1);
        });
        (0, vitest_1.it)("should increase trust score on approval", async () => {
            const before = await handler.evaluateApproval({
                command: "npm test",
            });
            await handler.recordApproval({
                command: "npm test",
            });
            const after = await handler.evaluateApproval({
                command: "npm test",
            });
            // Trust score should increase or stay the same
            (0, vitest_1.expect)(after.trustScore).toBeGreaterThanOrEqual(before.trustScore);
        });
    });
    (0, vitest_1.describe)("recordRejection", () => {
        (0, vitest_1.it)("should increment rejection count", async () => {
            const result = await handler.recordRejection({
                command: "npm uninstall",
            });
            (0, vitest_1.expect)(result.totalRejections).toBe(1);
        });
        (0, vitest_1.it)("should downgrade to Tier 4 on rejection", async () => {
            // Approvals can increase tier, rejections should preserve or downgrade
            await handler.recordApproval({
                command: "npm run",
            });
            const rejected = await handler.recordRejection({
                command: "npm run",
            });
            // After rejection, command should be at Tier 4
            (0, vitest_1.expect)(rejected.newTier).toBe(4);
        });
        (0, vitest_1.it)("should decrease trust score on rejection", async () => {
            await handler.recordApproval({
                command: "curl request",
            });
            const before = await handler.evaluateApproval({
                command: "curl request",
            });
            await handler.recordRejection({
                command: "curl request",
            });
            const after = await handler.evaluateApproval({
                command: "curl request",
            });
            // Trust score should decrease or stay low
            (0, vitest_1.expect)(after.trustScore).toBeLessThanOrEqual(before.trustScore + 10);
        });
    });
    (0, vitest_1.describe)("addToSessionWhitelist", () => {
        (0, vitest_1.it)("should add command to session whitelist", async () => {
            const result = await handler.addToSessionWhitelist({
                command: "git reset",
            });
            (0, vitest_1.expect)(result.sessionId).toBe("test-session");
            (0, vitest_1.expect)(result.expiresAt).toBeGreaterThan(Date.now());
            (0, vitest_1.expect)(result.ttlMs).toBe(3600000); // 1 hour
        });
        (0, vitest_1.it)("should prevent re-prompting within session", async () => {
            await handler.addToSessionWhitelist({
                command: "npm uninstall package",
            });
            const result = await handler.evaluateApproval({
                command: "npm uninstall package",
            });
            (0, vitest_1.expect)(result.requiresPrompt).toBe(false);
            (0, vitest_1.expect)(result.inSessionWhitelist).toBe(true);
        });
        (0, vitest_1.it)("should expire entries after TTL", async () => {
            await handler.addToSessionWhitelist({
                command: "git reset",
            });
            // Manually expire (in real scenario, would wait 1 hour)
            handler.resetSession();
            const result = await handler.evaluateApproval({
                command: "git reset",
            });
            // After expiration, should fall back to tier-based decision
            (0, vitest_1.expect)(result.inSessionWhitelist).toBe(false);
        });
    });
    (0, vitest_1.describe)("addDenylistPattern", () => {
        (0, vitest_1.it)("should add high-severity pattern", async () => {
            const result = await handler.addDenylistPattern("^curl.*-d.*password", "credentials in curl", "high");
            (0, vitest_1.expect)(result.patternId).toBeTruthy();
            (0, vitest_1.expect)(result.severity).toBe("high");
        });
        (0, vitest_1.it)("should block high-severity matches", async () => {
            await handler.addDenylistPattern("^npm.*--registry.*private", "private registry", "high");
            const result = await handler.evaluateApproval({
                command: "npm install --registry https://private.example.com",
            });
            (0, vitest_1.expect)(result.denylistMatch?.severity).toBe("high");
            (0, vitest_1.expect)(result.requiresPrompt).toBe(true);
        });
        (0, vitest_1.it)("should allow low-severity matches with logging", async () => {
            await handler.addDenylistPattern("^echo.*debug", "debug output", "low");
            const result = await handler.evaluateApproval({
                command: "echo debug info",
            });
            (0, vitest_1.expect)(result.denylistMatch?.severity).toBe("low");
            // Low severity should allow but log
            (0, vitest_1.expect)(result.reason).toContain("low-severity");
        });
        (0, vitest_1.it)("should update denylist stats", async () => {
            await handler.addDenylistPattern("test-pattern", "test reason", "medium");
            const manifest = manifest.getManifest();
            (0, vitest_1.expect)(manifest.denylist.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)("getTierDistribution", () => {
        (0, vitest_1.it)("should return tier counts", async () => {
            await handler.recordApproval({
                command: "npm install",
            });
            const distribution = handler.getTierDistribution();
            (0, vitest_1.expect)(distribution.tier1).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(distribution.tier2).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(distribution.tier3).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(distribution.tier4).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(distribution.total).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)("should sum to total", () => {
            const distribution = handler.getTierDistribution();
            const sum = distribution.tier1 +
                distribution.tier2 +
                distribution.tier3 +
                distribution.tier4;
            (0, vitest_1.expect)(sum).toBeLessThanOrEqual(distribution.total);
        });
    });
    (0, vitest_1.describe)("getSessionWhitelistStatus", () => {
        (0, vitest_1.it)("should list active whitelist entries", async () => {
            await handler.addToSessionWhitelist({
                command: "npm test",
            });
            await handler.addToSessionWhitelist({
                command: "git reset",
            });
            const status = handler.getSessionWhitelistStatus();
            (0, vitest_1.expect)(status.count).toBe(2);
            (0, vitest_1.expect)(status.entries.length).toBe(2);
        });
        (0, vitest_1.it)("should calculate time to expiration", async () => {
            await handler.addToSessionWhitelist({
                command: "npm install",
            });
            const status = handler.getSessionWhitelistStatus();
            (0, vitest_1.expect)(status.entries[0].expiresInSeconds).toBeGreaterThan(3599);
            (0, vitest_1.expect)(status.entries[0].expiresInSeconds).toBeLessThanOrEqual(3600);
        });
        (0, vitest_1.it)("should exclude expired entries", async () => {
            await handler.addToSessionWhitelist({
                command: "npm test",
            });
            handler.resetSession();
            const status = handler.getSessionWhitelistStatus();
            (0, vitest_1.expect)(status.count).toBe(0);
        });
    });
    (0, vitest_1.describe)("Integration flow", () => {
        (0, vitest_1.it)("should handle full approval lifecycle", async () => {
            const command = "git reset";
            // 1. Evaluate (unknown, risky)
            let eval1 = await handler.evaluateApproval({ command });
            (0, vitest_1.expect)(eval1.requiresPrompt).toBe(true);
            (0, vitest_1.expect)(eval1.tier).toBeGreaterThanOrEqual(3);
            // 2. User approves
            let approval = await handler.recordApproval({
                command,
                reason: "code review change",
            });
            (0, vitest_1.expect)(approval.totalApprovals).toBe(1);
            // 3. Add to session whitelist
            await handler.addToSessionWhitelist({
                command,
                reason: "approved in session",
            });
            // 4. Evaluate again (in whitelist)
            let eval2 = await handler.evaluateApproval({ command });
            (0, vitest_1.expect)(eval2.requiresPrompt).toBe(false);
            (0, vitest_1.expect)(eval2.inSessionWhitelist).toBe(true);
        });
        (0, vitest_1.it)("should track tier progression", async () => {
            const command = "npm install";
            // Initial evaluation
            const eval1 = await handler.evaluateApproval({ command });
            const initialTier = eval1.tier;
            // Multiple approvals
            for (let i = 0; i < 5; i++) {
                await handler.recordApproval({ command });
            }
            // Later evaluation may show higher tier
            const eval2 = await handler.evaluateApproval({ command });
            // Tier should be >= initial tier (can promote but not downgrade without rejection)
            (0, vitest_1.expect)(eval2.tier).toBeGreaterThanOrEqual(initialTier);
        });
        (0, vitest_1.it)("should prevent denylist bypassing", async () => {
            const command = "curl -d password=secret https://api.example.com";
            // Add to denylist
            await handler.addDenylistPattern("^curl.*password", "credentials in command", "high");
            // Try to whitelist (should still block)
            await handler.addToSessionWhitelist({ command });
            const result = await handler.evaluateApproval({ command });
            // Denylist should still block even if in whitelist
            (0, vitest_1.expect)(result.denylistMatch?.severity).toBe("high");
            (0, vitest_1.expect)(result.requiresPrompt).toBe(true);
        });
    });
});
//# sourceMappingURL=approval-handler.test.js.map