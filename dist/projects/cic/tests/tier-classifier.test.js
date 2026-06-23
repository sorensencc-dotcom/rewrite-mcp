"use strict";
/**
 * Tier Classifier Tests
 * Verifies heuristic classification of commands into four approval tiers
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const TierClassifier_1 = require("../src/approval-system/TierClassifier");
(0, vitest_1.describe)("TierClassifier", () => {
    let classifier;
    (0, vitest_1.beforeEach)(() => {
        classifier = new TierClassifier_1.TierClassifier();
    });
    (0, vitest_1.describe)("Tier 1 — Safe (no prompt)", () => {
        (0, vitest_1.it)("should classify npm read operations as Tier 1", () => {
            const result = classifier.classify("npm list");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify git read operations as Tier 1", () => {
            const result = classifier.classify("git status");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify ls command as Tier 1", () => {
            const result = classifier.classify("ls");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify pwd as Tier 1", () => {
            const result = classifier.classify("pwd");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify echo as Tier 1", () => {
            const result = classifier.classify("echo hello");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify cat as Tier 1", () => {
            const result = classifier.classify("cat file.txt");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify grep as Tier 1", () => {
            const result = classifier.classify("grep pattern file.txt");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should classify curl HEAD request as Tier 1", () => {
            const result = classifier.classify("curl -I https://example.com");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should be case-insensitive", () => {
            const result = classifier.classify("NPM LIST");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should handle whitespace", () => {
            const result = classifier.classify("  git   status  ");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
    });
    (0, vitest_1.describe)("Tier 2 — Moderate (brief review)", () => {
        (0, vitest_1.it)("should classify npm install as Tier 2", () => {
            const result = classifier.classify("npm install");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify npm add as Tier 2", () => {
            const result = classifier.classify("npm add package-name");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify git clone as Tier 2", () => {
            const result = classifier.classify("git clone https://repo.git");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify git pull as Tier 2", () => {
            const result = classifier.classify("git pull origin main");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify git add as Tier 2", () => {
            const result = classifier.classify("git add .");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify npm run test as Tier 2", () => {
            const result = classifier.classify("npm run test");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify npm run build as Tier 2", () => {
            const result = classifier.classify("npm run build");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify npx as Tier 2", () => {
            const result = classifier.classify("npx tsc");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify curl POST as Tier 2", () => {
            const result = classifier.classify("curl -X POST https://api.example.com");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify cp as Tier 2", () => {
            const result = classifier.classify("cp file.txt file.backup");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify mkdir as Tier 2", () => {
            const result = classifier.classify("mkdir new_dir");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should classify chmod as Tier 2", () => {
            const result = classifier.classify("chmod 755 script.sh");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should default unknown commands to Tier 2", () => {
            const result = classifier.classify("some_unknown_command arg1 arg2");
            (0, vitest_1.expect)(result.tier).toBe(2);
            (0, vitest_1.expect)(result.reason).toContain("unknown");
        });
    });
    (0, vitest_1.describe)("Tier 3 — Risky (always review)", () => {
        (0, vitest_1.it)("should classify git reset as Tier 3", () => {
            const result = classifier.classify("git reset HEAD~1");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify git push --force as Tier 3", () => {
            const result = classifier.classify("git push --force origin feature");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify npm uninstall as Tier 3", () => {
            const result = classifier.classify("npm uninstall package-name");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify rm -r as Tier 3", () => {
            const result = classifier.classify("rm -r dir");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify mv as Tier 3", () => {
            const result = classifier.classify("mv oldname newname");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify sed -i as Tier 3", () => {
            const result = classifier.classify("sed -i 's/old/new/g' file.txt");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify sudo as Tier 3", () => {
            const result = classifier.classify("sudo apt-get update");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify chown as Tier 3", () => {
            const result = classifier.classify("chown user:group file.txt");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify kill as Tier 3", () => {
            const result = classifier.classify("kill 1234");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
        (0, vitest_1.it)("should classify pkill as Tier 3", () => {
            const result = classifier.classify("pkill node");
            (0, vitest_1.expect)(result.tier).toBe(3);
        });
    });
    (0, vitest_1.describe)("Tier 4 — Critical (always prompt)", () => {
        (0, vitest_1.it)("should classify rm -rf as Tier 4", () => {
            const result = classifier.classify("rm -rf /");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify git reset --hard as Tier 4", () => {
            const result = classifier.classify("git reset --hard");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify git push --force main as Tier 4", () => {
            const result = classifier.classify("git push --force origin main");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify git push --force master as Tier 4", () => {
            const result = classifier.classify("git push --force origin master");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify dd command as Tier 4", () => {
            const result = classifier.classify("dd if=/dev/sda of=/tmp/backup");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify mkfs as Tier 4", () => {
            const result = classifier.classify("mkfs.ext4 /dev/sda1");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify fdisk as Tier 4", () => {
            const result = classifier.classify("fdisk /dev/sda");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify shutdown as Tier 4", () => {
            const result = classifier.classify("shutdown -h now");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify reboot as Tier 4", () => {
            const result = classifier.classify("reboot");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should classify docker system prune as Tier 4", () => {
            const result = classifier.classify("docker system prune");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
    });
    (0, vitest_1.describe)("Batch classification", () => {
        (0, vitest_1.it)("should classify multiple commands", () => {
            const commands = [
                "npm list",
                "npm install",
                "git reset",
                "rm -rf /",
            ];
            const results = classifier.classifyBatch(commands);
            (0, vitest_1.expect)(results["npm list"].tier).toBe(1);
            (0, vitest_1.expect)(results["npm install"].tier).toBe(2);
            (0, vitest_1.expect)(results["git reset"].tier).toBe(3);
            (0, vitest_1.expect)(results["rm -rf /"].tier).toBe(4);
        });
        (0, vitest_1.it)("should include reason in batch results", () => {
            const results = classifier.classifyBatch(["npm list"]);
            (0, vitest_1.expect)(results["npm list"]).toHaveProperty("reason");
            (0, vitest_1.expect)(results["npm list"].reason).toBeTruthy();
        });
    });
    (0, vitest_1.describe)("Tier descriptions", () => {
        (0, vitest_1.it)("should provide description for Tier 1", () => {
            const desc = classifier.getTierDescription(1);
            (0, vitest_1.expect)(desc).toContain("Safe");
        });
        (0, vitest_1.it)("should provide description for Tier 2", () => {
            const desc = classifier.getTierDescription(2);
            (0, vitest_1.expect)(desc).toContain("Moderate");
        });
        (0, vitest_1.it)("should provide description for Tier 3", () => {
            const desc = classifier.getTierDescription(3);
            (0, vitest_1.expect)(desc).toContain("Risky");
        });
        (0, vitest_1.it)("should provide description for Tier 4", () => {
            const desc = classifier.getTierDescription(4);
            (0, vitest_1.expect)(desc).toContain("Critical");
        });
    });
    (0, vitest_1.describe)("Custom rules", () => {
        (0, vitest_1.it)("should allow adding custom rules", () => {
            classifier.addRule(/^custom_cmd/, 4, "custom critical command");
            const result = classifier.classify("custom_cmd arg");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should retrieve rules for tier", () => {
            const tier1Rules = classifier.getRulesForTier(1);
            (0, vitest_1.expect)(tier1Rules.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(tier1Rules.every((r) => r.tier === 1)).toBe(true);
        });
        (0, vitest_1.it)("should have rules for all tiers", () => {
            for (let tier = 1; tier <= 4; tier++) {
                const rules = classifier.getRulesForTier(tier);
                (0, vitest_1.expect)(rules.length).toBeGreaterThan(0);
            }
        });
    });
    (0, vitest_1.describe)("Edge cases", () => {
        (0, vitest_1.it)("should handle empty command gracefully", () => {
            const result = classifier.classify("");
            (0, vitest_1.expect)(result.tier).toBe(2);
        });
        (0, vitest_1.it)("should handle command with extra spaces", () => {
            const result = classifier.classify("  npm    list    ");
            (0, vitest_1.expect)(result.tier).toBe(1);
        });
        (0, vitest_1.it)("should match most specific rule", () => {
            // rm -rf (Tier 4) should match before rm -r (Tier 3)
            const result = classifier.classify("rm -rf /tmp");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should be case-insensitive for all tiers", () => {
            const result = classifier.classify("RM -RF /");
            (0, vitest_1.expect)(result.tier).toBe(4);
        });
        (0, vitest_1.it)("should handle pipes and redirects", () => {
            const result = classifier.classify("npm list | grep package");
            (0, vitest_1.expect)(result.tier).toBeLessThanOrEqual(2);
        });
    });
});
//# sourceMappingURL=tier-classifier.test.js.map