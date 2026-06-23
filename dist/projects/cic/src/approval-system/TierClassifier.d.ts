/**
 * Four-Tier Classification Engine
 * Assigns commands to approval tiers based on heuristic rules and explicit overrides
 */
import { ApprovalTier } from "./types";
interface ClassificationRule {
    pattern: RegExp;
    tier: ApprovalTier;
    description: string;
}
export declare class TierClassifier {
    private rules;
    constructor();
    private initializeDefaultRules;
    addRule(pattern: RegExp, tier: ApprovalTier, description: string): void;
    classify(command: string): {
        tier: ApprovalTier;
        reason: string;
    };
    classifyBatch(commands: string[]): Record<string, {
        tier: ApprovalTier;
        reason: string;
    }>;
    getTierDescription(tier: ApprovalTier): string;
    getRulesForTier(tier: ApprovalTier): ClassificationRule[];
}
export {};
//# sourceMappingURL=TierClassifier.d.ts.map