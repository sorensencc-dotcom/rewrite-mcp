/**
 * projects/cic/src/reasoning/arl/engine/NarrativeImpactEngine.ts
 * Autonomous Reasoning Layer — Narrative Impact scoring engine.
 *
 * Determines narrative consequences of integrating a candidate expansion:
 * reinforcement of narrative spine, dilution, contradiction, novelty,
 * narrative risk signals.
 */
import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { NarrativeImpact } from '../contracts/NarrativeImpact';
export declare function computeNarrativeImpact(packet: ReasoningPacket): NarrativeImpact;
