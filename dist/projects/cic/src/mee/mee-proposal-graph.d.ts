import { PhaseProposal, PhasePatchSet } from "./mee-schema.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
export interface ProposalNode {
    id: string;
    proposal: PhaseProposal;
    patchSet: PhasePatchSet | null;
}
export interface DependencyEdge {
    from: string;
    to: string;
    reason: string;
}
export interface Conflict {
    proposalA: string;
    proposalB: string;
    path: string;
    type: "overwrite" | "schema" | "logical";
}
export interface ProposalGraph {
    nodes: ProposalNode[];
    edges: DependencyEdge[];
    conflicts: Conflict[];
}
export declare class MeeProposalGraph {
    private readonly synth;
    private readonly validator;
    constructor(synth: MeePatchSynthesizer, validator: MeeValidator);
    buildGraph(proposals: PhaseProposal[]): ProposalGraph;
    topologicalSort(graph: ProposalGraph): ProposalNode[];
}
//# sourceMappingURL=mee-proposal-graph.d.ts.map