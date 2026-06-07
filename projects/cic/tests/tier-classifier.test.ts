/**
 * Tier Classifier Tests
 * Verifies heuristic classification of commands into four approval tiers
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TierClassifier } from "../src/approval-system/TierClassifier";

describe("TierClassifier", () => {
  let classifier: TierClassifier;

  beforeEach(() => {
    classifier = new TierClassifier();
  });

  describe("Tier 1 — Safe (no prompt)", () => {
    it("should classify npm read operations as Tier 1", () => {
      const result = classifier.classify("npm list");
      expect(result.tier).toBe(1);
    });

    it("should classify git read operations as Tier 1", () => {
      const result = classifier.classify("git status");
      expect(result.tier).toBe(1);
    });

    it("should classify ls command as Tier 1", () => {
      const result = classifier.classify("ls");
      expect(result.tier).toBe(1);
    });

    it("should classify pwd as Tier 1", () => {
      const result = classifier.classify("pwd");
      expect(result.tier).toBe(1);
    });

    it("should classify echo as Tier 1", () => {
      const result = classifier.classify("echo hello");
      expect(result.tier).toBe(1);
    });

    it("should classify cat as Tier 1", () => {
      const result = classifier.classify("cat file.txt");
      expect(result.tier).toBe(1);
    });

    it("should classify grep as Tier 1", () => {
      const result = classifier.classify("grep pattern file.txt");
      expect(result.tier).toBe(1);
    });

    it("should classify curl HEAD request as Tier 1", () => {
      const result = classifier.classify("curl -I https://example.com");
      expect(result.tier).toBe(1);
    });

    it("should be case-insensitive", () => {
      const result = classifier.classify("NPM LIST");
      expect(result.tier).toBe(1);
    });

    it("should handle whitespace", () => {
      const result = classifier.classify("  git   status  ");
      expect(result.tier).toBe(1);
    });
  });

  describe("Tier 2 — Moderate (brief review)", () => {
    it("should classify npm install as Tier 2", () => {
      const result = classifier.classify("npm install");
      expect(result.tier).toBe(2);
    });

    it("should classify npm add as Tier 2", () => {
      const result = classifier.classify("npm add package-name");
      expect(result.tier).toBe(2);
    });

    it("should classify git clone as Tier 2", () => {
      const result = classifier.classify("git clone https://repo.git");
      expect(result.tier).toBe(2);
    });

    it("should classify git pull as Tier 2", () => {
      const result = classifier.classify("git pull origin main");
      expect(result.tier).toBe(2);
    });

    it("should classify git add as Tier 2", () => {
      const result = classifier.classify("git add .");
      expect(result.tier).toBe(2);
    });

    it("should classify npm run test as Tier 2", () => {
      const result = classifier.classify("npm run test");
      expect(result.tier).toBe(2);
    });

    it("should classify npm run build as Tier 2", () => {
      const result = classifier.classify("npm run build");
      expect(result.tier).toBe(2);
    });

    it("should classify npx as Tier 2", () => {
      const result = classifier.classify("npx tsc");
      expect(result.tier).toBe(2);
    });

    it("should classify curl POST as Tier 2", () => {
      const result = classifier.classify("curl -X POST https://api.example.com");
      expect(result.tier).toBe(2);
    });

    it("should classify cp as Tier 2", () => {
      const result = classifier.classify("cp file.txt file.backup");
      expect(result.tier).toBe(2);
    });

    it("should classify mkdir as Tier 2", () => {
      const result = classifier.classify("mkdir new_dir");
      expect(result.tier).toBe(2);
    });

    it("should classify chmod as Tier 2", () => {
      const result = classifier.classify("chmod 755 script.sh");
      expect(result.tier).toBe(2);
    });

    it("should default unknown commands to Tier 2", () => {
      const result = classifier.classify("some_unknown_command arg1 arg2");
      expect(result.tier).toBe(2);
      expect(result.reason).toContain("unknown");
    });
  });

  describe("Tier 3 — Risky (always review)", () => {
    it("should classify git reset as Tier 3", () => {
      const result = classifier.classify("git reset HEAD~1");
      expect(result.tier).toBe(3);
    });

    it("should classify git push --force as Tier 3", () => {
      const result = classifier.classify("git push --force origin feature");
      expect(result.tier).toBe(3);
    });

    it("should classify npm uninstall as Tier 3", () => {
      const result = classifier.classify("npm uninstall package-name");
      expect(result.tier).toBe(3);
    });

    it("should classify rm -r as Tier 3", () => {
      const result = classifier.classify("rm -r dir");
      expect(result.tier).toBe(3);
    });

    it("should classify mv as Tier 3", () => {
      const result = classifier.classify("mv oldname newname");
      expect(result.tier).toBe(3);
    });

    it("should classify sed -i as Tier 3", () => {
      const result = classifier.classify("sed -i 's/old/new/g' file.txt");
      expect(result.tier).toBe(3);
    });

    it("should classify sudo as Tier 3", () => {
      const result = classifier.classify("sudo apt-get update");
      expect(result.tier).toBe(3);
    });

    it("should classify chown as Tier 3", () => {
      const result = classifier.classify("chown user:group file.txt");
      expect(result.tier).toBe(3);
    });

    it("should classify kill as Tier 3", () => {
      const result = classifier.classify("kill 1234");
      expect(result.tier).toBe(3);
    });

    it("should classify pkill as Tier 3", () => {
      const result = classifier.classify("pkill node");
      expect(result.tier).toBe(3);
    });
  });

  describe("Tier 4 — Critical (always prompt)", () => {
    it("should classify rm -rf as Tier 4", () => {
      const result = classifier.classify("rm -rf /");
      expect(result.tier).toBe(4);
    });

    it("should classify git reset --hard as Tier 4", () => {
      const result = classifier.classify("git reset --hard");
      expect(result.tier).toBe(4);
    });

    it("should classify git push --force main as Tier 4", () => {
      const result = classifier.classify("git push --force origin main");
      expect(result.tier).toBe(4);
    });

    it("should classify git push --force master as Tier 4", () => {
      const result = classifier.classify("git push --force origin master");
      expect(result.tier).toBe(4);
    });

    it("should classify dd command as Tier 4", () => {
      const result = classifier.classify("dd if=/dev/sda of=/tmp/backup");
      expect(result.tier).toBe(4);
    });

    it("should classify mkfs as Tier 4", () => {
      const result = classifier.classify("mkfs.ext4 /dev/sda1");
      expect(result.tier).toBe(4);
    });

    it("should classify fdisk as Tier 4", () => {
      const result = classifier.classify("fdisk /dev/sda");
      expect(result.tier).toBe(4);
    });

    it("should classify shutdown as Tier 4", () => {
      const result = classifier.classify("shutdown -h now");
      expect(result.tier).toBe(4);
    });

    it("should classify reboot as Tier 4", () => {
      const result = classifier.classify("reboot");
      expect(result.tier).toBe(4);
    });

    it("should classify docker system prune as Tier 4", () => {
      const result = classifier.classify("docker system prune");
      expect(result.tier).toBe(4);
    });
  });

  describe("Batch classification", () => {
    it("should classify multiple commands", () => {
      const commands = [
        "npm list",
        "npm install",
        "git reset",
        "rm -rf /",
      ];
      const results = classifier.classifyBatch(commands);

      expect(results["npm list"].tier).toBe(1);
      expect(results["npm install"].tier).toBe(2);
      expect(results["git reset"].tier).toBe(3);
      expect(results["rm -rf /"].tier).toBe(4);
    });

    it("should include reason in batch results", () => {
      const results = classifier.classifyBatch(["npm list"]);
      expect(results["npm list"]).toHaveProperty("reason");
      expect(results["npm list"].reason).toBeTruthy();
    });
  });

  describe("Tier descriptions", () => {
    it("should provide description for Tier 1", () => {
      const desc = classifier.getTierDescription(1);
      expect(desc).toContain("Safe");
    });

    it("should provide description for Tier 2", () => {
      const desc = classifier.getTierDescription(2);
      expect(desc).toContain("Moderate");
    });

    it("should provide description for Tier 3", () => {
      const desc = classifier.getTierDescription(3);
      expect(desc).toContain("Risky");
    });

    it("should provide description for Tier 4", () => {
      const desc = classifier.getTierDescription(4);
      expect(desc).toContain("Critical");
    });
  });

  describe("Custom rules", () => {
    it("should allow adding custom rules", () => {
      classifier.addRule(/^custom_cmd/, 4, "custom critical command");
      const result = classifier.classify("custom_cmd arg");
      expect(result.tier).toBe(4);
    });

    it("should retrieve rules for tier", () => {
      const tier1Rules = classifier.getRulesForTier(1);
      expect(tier1Rules.length).toBeGreaterThan(0);
      expect(tier1Rules.every((r) => r.tier === 1)).toBe(true);
    });

    it("should have rules for all tiers", () => {
      for (let tier = 1; tier <= 4; tier++) {
        const rules = classifier.getRulesForTier(tier as 1 | 2 | 3 | 4);
        expect(rules.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty command gracefully", () => {
      const result = classifier.classify("");
      expect(result.tier).toBe(2);
    });

    it("should handle command with extra spaces", () => {
      const result = classifier.classify("  npm    list    ");
      expect(result.tier).toBe(1);
    });

    it("should match most specific rule", () => {
      // rm -rf (Tier 4) should match before rm -r (Tier 3)
      const result = classifier.classify("rm -rf /tmp");
      expect(result.tier).toBe(4);
    });

    it("should be case-insensitive for all tiers", () => {
      const result = classifier.classify("RM -RF /");
      expect(result.tier).toBe(4);
    });

    it("should handle pipes and redirects", () => {
      const result = classifier.classify("npm list | grep package");
      expect(result.tier).toBeLessThanOrEqual(2);
    });
  });
});
