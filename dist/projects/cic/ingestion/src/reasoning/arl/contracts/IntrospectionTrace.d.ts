export interface SubsystemTrace {
    subsystemId: 'coherence' | 'semantic' | 'temporal' | 'causal' | 'narrative';
    score: number;
    details: string;
    reasoning: string;
}
export interface EntityAlignment {
    entityId: string;
    alignmentScore: number;
    semanticDetails: string;
}
export interface CausalChain {
    nodeId: string;
    relationship: string;
    target: string;
    strength: number;
}
export interface TemporalOrdering {
    eventId: string;
    timestamp: string;
    sequencePosition: number;
}
export interface IntrospectionTrace {
    id: string;
    timestamp: string;
    subsystemTraces: SubsystemTrace[];
    entityAlignments: EntityAlignment[];
    causalChains: CausalChain[];
    temporalOrderings: TemporalOrdering[];
}
//# sourceMappingURL=IntrospectionTrace.d.ts.map