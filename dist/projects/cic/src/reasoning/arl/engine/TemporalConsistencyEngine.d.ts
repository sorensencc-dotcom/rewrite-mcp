/**
 * projects/cic/src/reasoning/arl/engine/TemporalConsistencyEngine.ts
 * Autonomous Reasoning Layer — Temporal Consistency scoring engine.
 *
 * Determines whether a candidate expansion maintains timeline coherence:
 * ordering, causality, timeline adjacency, drift-induced violations,
 * conflicts with narrative chronology, retroactive contradictions.
 */
import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { TemporalConsistency } from '../contracts/TemporalConsistency';
export declare function computeTemporalConsistency(packet: ReasoningPacket): TemporalConsistency;
//# sourceMappingURL=TemporalConsistencyEngine.d.ts.map