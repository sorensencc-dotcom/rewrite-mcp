import { ExpansionContext } from '../contracts/ExpansionContext';
import { AdversarialAnalysisResult } from '../contracts/AdversarialAnalysisResult';
export declare class AdversarialResistanceEngine {
    analyze(expansion: ExpansionContext): AdversarialAnalysisResult;
    private detectPromptInjection;
    private detectCausalInversion;
    private detectNarrativeHijack;
    private detectPoisoning;
}
//# sourceMappingURL=AdversarialResistanceEngine.d.ts.map