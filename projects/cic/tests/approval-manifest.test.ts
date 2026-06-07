/**
 * Approval Manifest Tests
 * Unit tests for tier tracking, trust scoring, auto-promotion, session whitelist, denylist
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApprovalManifestManager } from "../src/approval-system/ApprovalManifest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("ApprovalManifestManager", () => {
  let manifestManager: ApprovalManifestManager;
  let tempDir: string;
  let manifestPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cic-approval-test-"));
    manifestPath = path.join(tempDir, "test-manifest.json");
    manifestManager = new ApprovalManifestManager(manifestPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Load / Save", () => {
    it("creates empty manifest if file not found", async () => {
      await manifestManager.load();
      const manifest = manifestManager.getManifest();

      expect(manifest.version).toBe("2.0.0");
      expect(manifest.approvals).toEqual({});
      expect(manifest.stats.totalRequests).toBe(0);
    });

    it("persists manifest with atomic write", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.save();

      // Verify file exists
      const content = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe("2.0.0");
      expect(Object.keys(parsed.approvals).length).toBe(1);
    });

    it("loads existing manifest on subsequent calls", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.save();

      // Create new instance and load
      const manager2 = new ApprovalManifestManager(manifestPath);
      await manager2.load();
      const manifest = manager2.getManifest();

      expect(Object.keys(manifest.approvals).length).toBe(1);
    });
  });

  describe("Approval Recording", () => {
    it("records first approval for new command", async () => {
      await manifestManager.load();
      const result = await manifestManager.recordApproval("npm run build");

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record).toBeDefined();
      expect(record?.approvalCount).toBe(1);
      expect(record?.rejectCount).toBe(0);
      expect(record?.tier).toBe(1);
      expect(result.promoted).toBe(false);
    });

    it("increments approval count on subsequent approvals", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("npm run build");

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.approvalCount).toBe(2);
    });

    it("auto-promotes to tier 2 after 3 approvals", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("npm run build");
      const result = await manifestManager.recordApproval("npm run build");

      expect(result.promoted).toBe(true);
      expect(result.newTier).toBe(2);

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.tier).toBe(2);
      expect(record?.autoPromotedAt).toBeDefined();
    });

    it("continues auto-promoting: tier 2→3→4", async () => {
      await manifestManager.load();

      // Tier 1→2 at 3 approvals
      for (let i = 0; i < 3; i++) {
        await manifestManager.recordApproval("npm run test");
      }

      let record = manifestManager.getApprovalRecord("npm run test");
      expect(record?.tier).toBe(2);

      // Tier 2→3 at 6 approvals
      for (let i = 0; i < 3; i++) {
        await manifestManager.recordApproval("npm run test");
      }

      record = manifestManager.getApprovalRecord("npm run test");
      expect(record?.tier).toBe(3);

      // Tier 3→4 at 9 approvals
      for (let i = 0; i < 3; i++) {
        await manifestManager.recordApproval("npm run test");
      }

      record = manifestManager.getApprovalRecord("npm run test");
      expect(record?.tier).toBe(4);
    });

    it("caps tier at 4 (no tier 5)", async () => {
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
      expect(record?.tier).toBe(4);
      expect(record?.approvalCount).toBe(12);
    });

    it("computes trust score from approval/rejection ratio", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("npm run build");

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.trustScore).toBeGreaterThan(0);
      expect(record?.trustScore).toBeLessThanOrEqual(100);
    });
  });

  describe("Rejection Recording", () => {
    it("records rejection and increments reject count", async () => {
      await manifestManager.load();
      await manifestManager.recordRejection("npm run build");

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.rejectCount).toBe(1);
      expect(record?.lastRejectedAt).toBeDefined();
      expect(manifestManager.getManifest().stats.rejectedCount).toBe(1);
    });

    it("reduces trust score when rejections increase", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("npm run build");

      let record = manifestManager.getApprovalRecord("npm run build");
      const scoreAfterApprovals = record?.trustScore ?? 0;

      await manifestManager.recordRejection("npm run build");

      record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.trustScore).toBeLessThan(scoreAfterApprovals);
    });
  });

  describe("Session Whitelist", () => {
    it("adds command to session whitelist", async () => {
      await manifestManager.load();
      await manifestManager.addToSessionWhitelist("npm run build");

      const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
      expect(isWhitelisted).toBe(true);
    });

    it("returns false for commands not in whitelist", async () => {
      await manifestManager.load();

      const isWhitelisted = manifestManager.isInSessionWhitelist(
        "npm run deploy"
      );
      expect(isWhitelisted).toBe(false);
    });

    it("removes expired whitelist entries", async () => {
      await manifestManager.load();

      // Mock the entry to have expired
      const manifest = manifestManager.getManifest();
      const commandId = "test";
      (manifest.sessionWhitelist as any)[commandId] = {
        commandId,
        command: "npm run build",
        addedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };

      const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
      expect(isWhitelisted).toBe(false);
    });

    it("session whitelist expires after 1 hour", async () => {
      await manifestManager.load();
      await manifestManager.addToSessionWhitelist("npm run build");

      // Manually expire the entry by setting expiresAt to past
      const manifest = manifestManager.getManifest();
      const entries = Object.values(manifest.sessionWhitelist);
      if (entries.length > 0) {
        entries[0].expiresAt = new Date(Date.now() - 1000).toISOString();
      }

      const isWhitelisted = manifestManager.isInSessionWhitelist("npm run build");
      expect(isWhitelisted).toBe(false);
    });
  });

  describe("Denylist Patterns", () => {
    it("adds denylist pattern", async () => {
      await manifestManager.load();
      await manifestManager.addDenylistPattern(
        "^rm\\s+-rf",
        "Recursive deletion",
        "high"
      );

      const manifest = manifestManager.getManifest();
      expect(manifest.denylistPatterns.length).toBe(1);
      expect(manifest.denylistPatterns[0].reason).toBe("Recursive deletion");
    });

    it("blocks commands matching denylist", async () => {
      await manifestManager.load();
      await manifestManager.addDenylistPattern(
        "^rm\\s+-rf",
        "Recursive deletion",
        "high"
      );

      const decision = manifestManager.getApprovalDecision("rm -rf /");
      expect(decision.approved).toBe(false);
      expect(decision.denylistMatch).toBeDefined();
      expect(decision.denylistMatch?.severity).toBe("high");
    });

    it("allows commands not matching denylist", async () => {
      await manifestManager.load();
      await manifestManager.addDenylistPattern(
        "^rm\\s+-rf",
        "Recursive deletion",
        "high"
      );

      const decision = manifestManager.getApprovalDecision("npm run build");
      expect(decision.approved).toBe(true);
      expect(decision.denylistMatch).toBeUndefined();
    });

    it("ignores low-severity denylist matches", async () => {
      await manifestManager.load();
      await manifestManager.addDenylistPattern(
        "debug",
        "Debug mode",
        "low"
      );

      const decision = manifestManager.getApprovalDecision("npm run debug");
      expect(decision.approved).toBe(true); // Low severity doesn't block
      expect(decision.denylistMatch).toBeDefined();
    });
  });

  describe("Approval Decisions", () => {
    it("tier 1 commands approved without prompt", async () => {
      await manifestManager.load();
      await manifestManager.recordApproval("npm run build");

      const decision = manifestManager.getApprovalDecision("npm run build");
      expect(decision.approved).toBe(true);
      expect(decision.requiresPrompt).toBe(false);
      expect(decision.tier).toBe(1);
    });

    it("tier 4 commands require prompt", async () => {
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
      expect(tier4Record?.tier).toBe(4);

      const decision = manifestManager.getApprovalDecision("npm run deploy");
      expect(decision.requiresPrompt).toBe(true);
    });

    it("new commands (no approval record) are tier 1", async () => {
      await manifestManager.load();

      const decision = manifestManager.getApprovalDecision("npm run new-cmd");
      expect(decision.approved).toBe(true);
      expect(decision.tier).toBe(1);
      expect(decision.requiresPrompt).toBe(false);
    });

    it("session whitelist overrides tier", async () => {
      await manifestManager.load();
      await manifestManager.recordRejection("npm run deploy");

      // Tier 4 would require prompt
      let decision = manifestManager.getApprovalDecision("npm run deploy");
      expect(decision.requiresPrompt).toBe(true);

      // Add to session whitelist
      await manifestManager.addToSessionWhitelist("npm run deploy");
      decision = manifestManager.getApprovalDecision("npm run deploy");
      expect(decision.requiresPrompt).toBe(false);
      expect(decision.inSessionWhitelist).toBe(true);
    });

    it("denylist blocks even whitelisted commands", async () => {
      await manifestManager.load();
      await manifestManager.addDenylistPattern(
        "rm\\s+-rf",
        "Dangerous",
        "high"
      );
      await manifestManager.addToSessionWhitelist("rm -rf /tmp");

      const decision = manifestManager.getApprovalDecision("rm -rf /tmp");
      expect(decision.approved).toBe(false);
      expect(decision.denylistMatch).toBeDefined();
    });
  });

  describe("Query Methods", () => {
    it("lists all tier 4 commands", async () => {
      await manifestManager.load();
      await manifestManager.recordRejection("npm run deploy");
      await manifestManager.recordRejection("npm run release");

      const tier4 = manifestManager.listTier4Commands();
      expect(tier4.length).toBeGreaterThanOrEqual(2);
      tier4.forEach((r) => expect(r.tier).toBe(4));
    });

    it("lists recently auto-promoted commands", async () => {
      await manifestManager.load();

      // Promote a command
      for (let i = 0; i < 3; i++) {
        await manifestManager.recordApproval("npm run build");
      }

      const promoted = manifestManager.listAutoPromotedCommands(3600000); // Last hour
      expect(promoted.length).toBeGreaterThan(0);
      promoted.forEach((r) => expect(r.autoPromotedAt).toBeDefined());
    });
  });

  describe("Normalization", () => {
    it("normalizes commands to stable IDs", async () => {
      await manifestManager.load();

      // Same command with different whitespace
      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("  npm run build  ");

      // Should be same record
      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.approvalCount).toBe(2);
    });

    it("case-insensitive command matching", async () => {
      await manifestManager.load();

      await manifestManager.recordApproval("npm run build");
      await manifestManager.recordApproval("NPM RUN BUILD");

      const record = manifestManager.getApprovalRecord("npm run build");
      expect(record?.approvalCount).toBe(2);
    });
  });
});
