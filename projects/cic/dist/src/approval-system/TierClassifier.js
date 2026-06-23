/**
 * Four-Tier Classification Engine
 * Assigns commands to approval tiers based on heuristic rules and explicit overrides
 */
export class TierClassifier {
    constructor() {
        this.rules = [];
        this.initializeDefaultRules();
    }
    initializeDefaultRules() {
        // Tier 1 — Safe (no prompt)
        this.addRule(/^npm\s+(install|list|show|view|info)/, 1, "npm read operations");
        this.addRule(/^git\s+(status|log|show|diff|branch\s+-a|remote\s+-v)/, 1, "git read operations");
        this.addRule(/^ls/, 1, "list directory");
        this.addRule(/^pwd/, 1, "print working directory");
        this.addRule(/^echo\s+/, 1, "echo command");
        this.addRule(/^cat\s+/, 1, "read file");
        this.addRule(/^grep/, 1, "search text");
        this.addRule(/^which/, 1, "find command");
        this.addRule(/^type\s+/, 1, "check type");
        this.addRule(/^node\s+-v/, 1, "check node version");
        this.addRule(/^npm\s+-v/, 1, "check npm version");
        this.addRule(/^curl\s+(-i|--head)/, 1, "HEAD request");
        this.addRule(/^curl\s+(-s|--silent)\s+(https?:\/\/)/, 1, "silent GET request");
        // Tier 2 — Moderate (brief review)
        this.addRule(/^npm\s+(install|add|update|upgrade|remove)/, 2, "npm package management");
        this.addRule(/^git\s+(clone|pull|fetch)/, 2, "git repository sync");
        this.addRule(/^git\s+(add|commit|push)/, 2, "git history modification");
        this.addRule(/^npm\s+run\s+test/, 2, "test execution");
        this.addRule(/^npm\s+run\s+build/, 2, "build execution");
        this.addRule(/^npx\s+/, 2, "npx execution");
        this.addRule(/^docker\s+(build|run|pull)/, 2, "docker operations");
        this.addRule(/^cp\s+/, 2, "copy file");
        this.addRule(/^mkdir/, 2, "create directory");
        this.addRule(/^curl\s+-X\s+(POST|PUT|PATCH)/, 2, "HTTP write request");
        this.addRule(/^find\s+/, 2, "find files");
        this.addRule(/^chmod\s+[^0]*[0-7]/, 2, "change permissions");
        // Tier 3 — Risky (always review)
        this.addRule(/^git\s+reset/, 3, "git history rewrite");
        this.addRule(/^git\s+force/, 3, "force git operation");
        this.addRule(/^git\s+push\s+--force/, 3, "force push");
        this.addRule(/^npm\s+uninstall\s+/, 3, "uninstall package");
        this.addRule(/^rm\s+-r/, 3, "recursive delete");
        this.addRule(/^mv\s+/, 3, "move/rename file");
        this.addRule(/^sed\s+-i/, 3, "in-place file modification");
        this.addRule(/^docker\s+(rm|stop|kill)/, 3, "docker resource removal");
        this.addRule(/^docker\s+exec/, 3, "docker command execution");
        this.addRule(/^sudo\s+/, 3, "sudo execution");
        this.addRule(/^chown/, 3, "change ownership");
        this.addRule(/^kill\s+/, 3, "kill process");
        this.addRule(/^pkill/, 3, "kill by name");
        // Tier 4 — Critical (always prompt)
        this.addRule(/^rm\s+-rf/, 4, "recursive force delete");
        this.addRule(/^git\s+push\s+--force.*(master|main)/, 4, "force push to main branch");
        this.addRule(/^git\s+reset\s+--hard/, 4, "hard reset");
        this.addRule(/^docker\s+system\s+prune/, 4, "docker system cleanup");
        this.addRule(/^sudo\s+rm/, 4, "sudo delete");
        this.addRule(/^dd\s+/, 4, "disk write");
        this.addRule(/^mkfs/, 4, "filesystem format");
        this.addRule(/^fdisk/, 4, "partition modification");
        this.addRule(/^lsof\s+/, 3, "list open files (risky context)");
        this.addRule(/^shutdown\s+/, 4, "shutdown system");
        this.addRule(/^reboot/, 4, "reboot system");
    }
    addRule(pattern, tier, description) {
        this.rules.push({ pattern, tier, description });
    }
    classify(command) {
        const normalized = command.trim().toLowerCase();
        // Check rules in reverse order (most specific first)
        for (let i = this.rules.length - 1; i >= 0; i--) {
            const rule = this.rules[i];
            if (rule.pattern.test(normalized)) {
                return {
                    tier: rule.tier,
                    reason: rule.description,
                };
            }
        }
        // Default: unknown commands are Tier 2 (moderate risk)
        return {
            tier: 2,
            reason: "unknown command (default tier)",
        };
    }
    classifyBatch(commands) {
        const results = {};
        for (const command of commands) {
            results[command] = this.classify(command);
        }
        return results;
    }
    getTierDescription(tier) {
        switch (tier) {
            case 1:
                return "Safe — No approval prompt";
            case 2:
                return "Moderate — Brief review";
            case 3:
                return "Risky — Always review";
            case 4:
                return "Critical — Always prompt";
            default:
                return "Unknown";
        }
    }
    getRulesForTier(tier) {
        return this.rules.filter((rule) => rule.tier === tier);
    }
}
//# sourceMappingURL=TierClassifier.js.map