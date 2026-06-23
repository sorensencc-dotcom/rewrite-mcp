/**
 * projects/cic/src/reasoning/arl/engine/CoherenceEngine.ts
 * Autonomous Reasoning Layer — Coherence scoring engine.
 *
 * Measures coherence across narrative, semantic, and temporal dimensions.
 * Produces a composite score that feeds into the Verdict Synthesizer.
 */
import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { CoherenceScore } from '../contracts/CoherenceScore';
export declare function computeCoherence(packet: ReasoningPacket): CoherenceScore;
