/**
 * projects/cic/src/reasoning/arl/index.ts
 * Autonomous Reasoning Layer (ARL) entrypoint.
 */
import { ReasoningPacket } from './contracts/ReasoningPacket.js';
import { ReasoningVerdict } from './contracts/ReasoningVerdict.js';
export { ArlCandidate, ArlContext, ReasoningPacket } from './contracts/ReasoningPacket.js';
export { ArlVerdictType, ReasoningStep, ReasoningVerdict } from './contracts/ReasoningVerdict.js';
export { CoherenceScore } from './contracts/CoherenceScore.js';
export { SemanticAlignment } from './contracts/SemanticAlignment.js';
export { TemporalConsistency } from './contracts/TemporalConsistency.js';
export { CausalReasoning } from './contracts/CausalReasoning.js';
export { NarrativeImpact } from './contracts/NarrativeImpact.js';
export { CompositeReasoning } from './contracts/CompositeReasoning.js';
export { ArlConfidence } from './contracts/Confidence.js';
export { DriftImpact } from './contracts/DriftImpact.js';
export { ArlTraceRecord, ArlTraceQuery, ArlTraceStatistics, getArlTraceStore, ArlTraceAnalyzer } from './traces/index.js';
export declare function runArl(packet: ReasoningPacket): Promise<ReasoningVerdict>;
