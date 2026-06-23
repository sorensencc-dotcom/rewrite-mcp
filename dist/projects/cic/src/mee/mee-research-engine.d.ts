import { ResearchFinding, MeeMetaRule } from "./mee-schema.js";
import { FileMeeResearchFindingStore } from "./mee-research-finding-store.js";
import { FileMeeMetaRuleStore } from "./mee-meta-rule-store.js";
import { MeeKnowledgeGraph } from "./mee-kg.js";
import { FileMeeRunStore } from "./mee-run-store.js";
import { FileMeeRunFailureContextStore } from "./mee-autonomous-store.js";
export declare class MeeResearchEngine {
    private readonly findingsStore;
    private readonly metaRulesStore;
    private readonly runStore;
    private readonly failureStore;
    private readonly llmClient?;
    constructor(findingsStore: FileMeeResearchFindingStore, metaRulesStore: FileMeeMetaRuleStore, runStore: FileMeeRunStore, failureStore: FileMeeRunFailureContextStore, llmClient?: {
        complete(options: {
            model: string;
            prompt: string;
            max_tokens?: number;
        }): Promise<{
            text: string;
        }>;
    } | undefined);
    runResearchScan(kg: MeeKnowledgeGraph): Promise<{
        findings: ResearchFinding[];
        rules: MeeMetaRule[];
    }>;
}
//# sourceMappingURL=mee-research-engine.d.ts.map