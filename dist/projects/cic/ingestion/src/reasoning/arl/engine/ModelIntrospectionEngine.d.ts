import { ExpansionContext } from '../contracts/ExpansionContext';
import { IntrospectionTrace } from '../contracts/IntrospectionTrace';
export declare class ModelIntrospectionEngine {
    introspect(expansion: ExpansionContext): IntrospectionTrace;
    private generateSubsystemTraces;
    private generateEntityAlignments;
    private generateCausalChains;
    private generateTemporalOrderings;
    private scoreCoherence;
    private scoreSemantic;
    private scoreTemporal;
    private scoreCausal;
    private scoreNarrative;
}
//# sourceMappingURL=ModelIntrospectionEngine.d.ts.map