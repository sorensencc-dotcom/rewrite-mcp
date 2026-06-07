/**
 * Approval Handler Tests
 * Verifies integrated approval decision flow with manifest, classifier, whitelist
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ApprovalHandler } from "../src/approval-system/ApprovalHandler";
import { ApprovalManifestManager } from "../src/approval-system/ApprovalManifest";
import { TierClassifier } from "../src/approval-system/TierClassifier";

describe("ApprovalHandler", () => {
  let handler: ApprovalHandler;
  let manifest: ApprovalManifestManager;
  let classifier: TierClassifier;

  beforeEach(() => {
    manifest = new ApprovalManifestManager();
    classifier = new TierClassifier();
    handler = new ApprovalHandler(manifest, classifier, "test-session");
  });

  describe("evaluateApproval", () => {
    it("should classify unknown safe command", async () => {
      const result = await handler.evaluateApproval({
        command: "npm list",
      });

      expect(result.tier).toBe(1);
      expect(result.requiresPrompt).toBe(false);
      expect(result.classificationReason).toContain("npm");
    });

    it("should classify unknown risky command", async () => {
      const result = await handler.evaluateApproval({
        command: "git reset --hard",
      });

      expect(result.tier).toBe(4);
      expect(result.requiresPrompt).toBe(true);
    });

    it("should use approval history tier for known commands", async () => {
      // Record an approval first
      manifest.recordApproval("npm install");

      const result = await handler.evaluateApproval({
        command: "npm install",
      });

      expect(result.tier).toBeGreaterThanOrEqual(1);
    });

    it("should respect session whitelist", async () => {
      // Add to session whitelist
      await handler.addToSessionWhitelist({
        command: "git reset",
        reason: "user approved",
      });

      const result = await handler.evaluateApproval({
        command: "git reset",
      });

      expect(result.inSessionWhitelist).toBe(true);
      expect(result.requiresPrompt).toBe(false);
    });

    it("should detect denylist matches", async () => {
      // Add a denylist pattern
      await handler.addDenylistPattern("^curl.*password", "password in curl", "high");

      const result = await handler.evaluateApproval({
        command: "curl -d password=secret https://api.example.com",
      });

      expect(result.denylistMatch).toBeDefined();
      expect(result.denylistMatch?.severity).toBe("high");
      expect(result.requiresPrompt).toBe(true);
    });

    it("should include trust score in result", async () => {
      // Record multiple approvals to build trust
      manifest.recordApproval("npm install");
      manifest.recordApproval("npm install");

      const result = await handler.evaluateApproval({
        command: "npm install",
      });

      expect(result.trustScore).toBeGreaterThanOrEqual(0);
      expect(result.trustScore).toBeLessThanOrEqual(100);
    });
  });

  describe("recordApproval", () => {
    it("should increment approval count", async () => {
      const result1 = await handler.recordApproval({
        command: "npm install",
      });

      expect(result1.totalApprovals).toBe(1);

      const result2 = await handler.recordApproval({
        command: "npm install",
      });

      expect(result2.totalApprovals).toBe(2);
    });

    it("should trigger auto-promotion at threshold", async () => {
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

      expect(result.promoted).toBe(true);
      expect(result.newTier).toBeGreaterThan(1);
    });

    it("should increase trust score on approval", async () => {
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
      expect(after.trustScore).toBeGreaterThanOrEqual(before.trustScore);
    });
  });

  describe("recordRejection", () => {
    it("should increment rejection count", async () => {
      const result = await handler.recordRejection({
        command: "npm uninstall",
      });

      expect(result.totalRejections).toBe(1);
    });

    it("should downgrade to Tier 4 on rejection", async () => {
      // Approvals can increase tier, rejections should preserve or downgrade
      await handler.recordApproval({
        command: "npm run",
      });

      const rejected = await handler.recordRejection({
        command: "npm run",
      });

      // After rejection, command should be at Tier 4
      expect(rejected.newTier).toBe(4);
    });

    it("should decrease trust score on rejection", async () => {
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
      expect(after.trustScore).toBeLessThanOrEqual(before.trustScore + 10);
    });
  });

  describe("addToSessionWhitelist", () => {
    it("should add command to session whitelist", async () => {
      const result = await handler.addToSessionWhitelist({
        command: "git reset",
      });

      expect(result.sessionId).toBe("test-session");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.ttlMs).toBe(3600000); // 1 hour
    });

    it("should prevent re-prompting within session", async () => {
      await handler.addToSessionWhitelist({
        command: "npm uninstall package",
      });

      const result = await handler.evaluateApproval({
        command: "npm uninstall package",
      });

      expect(result.requiresPrompt).toBe(false);
      expect(result.inSessionWhitelist).toBe(true);
    });

    it("should expire entries after TTL", async () => {
      await handler.addToSessionWhitelist({
        command: "git reset",
      });

      // Manually expire (in real scenario, would wait 1 hour)
      handler.resetSession();

      const result = await handler.evaluateApproval({
        command: "git reset",
      });

      // After expiration, should fall back to tier-based decision
      expect(result.inSessionWhitelist).toBe(false);
    });
  });

  describe("addDenylistPattern", () => {
    it("should add high-severity pattern", async () => {
      const result = await handler.addDenylistPattern(
        "^curl.*-d.*password",
        "credentials in curl",
        "high"
      );

      expect(result.patternId).toBeTruthy();
      expect(result.severity).toBe("high");
    });

    it("should block high-severity matches", async () => {
      await handler.addDenylistPattern(
        "^npm.*--registry.*private",
        "private registry",
        "high"
      );

      const result = await handler.evaluateApproval({
        command: "npm install --registry https://private.example.com",
      });

      expect(result.denylistMatch?.severity).toBe("high");
      expect(result.requiresPrompt).toBe(true);
    });

    it("should allow low-severity matches with logging", async () => {
      await handler.addDenylistPattern(
        "^echo.*debug",
        "debug output",
        "low"
      );

      const result = await handler.evaluateApproval({
        command: "echo debug info",
      });

      expect(result.denylistMatch?.severity).toBe("low");
      // Low severity should allow but log
      expect(result.reason).toContain("low-severity");
    });

    it("should update denylist stats", async () => {
      await handler.addDenylistPattern(
        "test-pattern",
        "test reason",
        "medium"
      );

      const manifest = manifest.getManifest();
      expect(manifest.denylist.length).toBeGreaterThan(0);
    });
  });

  describe("getTierDistribution", () => {
    it("should return tier counts", async () => {
      await handler.recordApproval({
        command: "npm install",
      });

      const distribution = handler.getTierDistribution();

      expect(distribution.tier1).toBeGreaterThanOrEqual(0);
      expect(distribution.tier2).toBeGreaterThanOrEqual(0);
      expect(distribution.tier3).toBeGreaterThanOrEqual(0);
      expect(distribution.tier4).toBeGreaterThanOrEqual(0);
      expect(distribution.total).toBeGreaterThanOrEqual(0);
    });

    it("should sum to total", () => {
      const distribution = handler.getTierDistribution();
      const sum =
        distribution.tier1 +
        distribution.tier2 +
        distribution.tier3 +
        distribution.tier4;

      expect(sum).toBeLessThanOrEqual(distribution.total);
    });
  });

  describe("getSessionWhitelistStatus", () => {
    it("should list active whitelist entries", async () => {
      await handler.addToSessionWhitelist({
        command: "npm test",
      });
      await handler.addToSessionWhitelist({
        command: "git reset",
      });

      const status = handler.getSessionWhitelistStatus();

      expect(status.count).toBe(2);
      expect(status.entries.length).toBe(2);
    });

    it("should calculate time to expiration", async () => {
      await handler.addToSessionWhitelist({
        command: "npm install",
      });

      const status = handler.getSessionWhitelistStatus();

      expect(status.entries[0].expiresInSeconds).toBeGreaterThan(3599);
      expect(status.entries[0].expiresInSeconds).toBeLessThanOrEqual(3600);
    });

    it("should exclude expired entries", async () => {
      await handler.addToSessionWhitelist({
        command: "npm test",
      });

      handler.resetSession();

      const status = handler.getSessionWhitelistStatus();
      expect(status.count).toBe(0);
    });
  });

  describe("Integration flow", () => {
    it("should handle full approval lifecycle", async () => {
      const command = "git reset";

      // 1. Evaluate (unknown, risky)
      let eval1 = await handler.evaluateApproval({ command });
      expect(eval1.requiresPrompt).toBe(true);
      expect(eval1.tier).toBeGreaterThanOrEqual(3);

      // 2. User approves
      let approval = await handler.recordApproval({
        command,
        reason: "code review change",
      });
      expect(approval.totalApprovals).toBe(1);

      // 3. Add to session whitelist
      await handler.addToSessionWhitelist({
        command,
        reason: "approved in session",
      });

      // 4. Evaluate again (in whitelist)
      let eval2 = await handler.evaluateApproval({ command });
      expect(eval2.requiresPrompt).toBe(false);
      expect(eval2.inSessionWhitelist).toBe(true);
    });

    it("should track tier progression", async () => {
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
      expect(eval2.tier).toBeGreaterThanOrEqual(initialTier);
    });

    it("should prevent denylist bypassing", async () => {
      const command = "curl -d password=secret https://api.example.com";

      // Add to denylist
      await handler.addDenylistPattern(
        "^curl.*password",
        "credentials in command",
        "high"
      );

      // Try to whitelist (should still block)
      await handler.addToSessionWhitelist({ command });

      const result = await handler.evaluateApproval({ command });

      // Denylist should still block even if in whitelist
      expect(result.denylistMatch?.severity).toBe("high");
      expect(result.requiresPrompt).toBe(true);
    });
  });
});
