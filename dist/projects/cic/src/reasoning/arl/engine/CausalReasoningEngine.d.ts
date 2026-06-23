/**
 * projects/cic/src/reasoning/arl/engine/CausalReasoningEngine.ts
 * Autonomous Reasoning Layer — Causal Reasoning scoring engine.
 *
 * Determines whether a candidate expansion preserves causal relationships:
 * causal chains, preconditions, consequences, dependency ordering,
 * causal contradictions, missing prerequisites, retroactive causal breaks.
 */
import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { CausalReasoning } from '../contracts/CausalReasoning';
export declare function computeCausalReasoning(packet: ReasoningPacket): CausalReasoning;
//# sourceMappingURL=CausalReasoningEngine.d.ts.map