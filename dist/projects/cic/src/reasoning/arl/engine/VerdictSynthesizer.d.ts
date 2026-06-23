import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { EvidenceScore } from './EvidenceScorer';
import { ContradictionAnalysis } from './ContradictionDetector';
import { ReasoningVerdict } from '../contracts/ReasoningVerdict';
import { SemanticAlignment } from '../contracts/SemanticAlignment';
import { CoherenceScore } from '../contracts/CoherenceScore';
import { TemporalConsistency } from '../contracts/TemporalConsistency';
import { CausalReasoning } from '../contracts/CausalReasoning';
import { NarrativeImpact } from '../contracts/NarrativeImpact';
import { CompositeReasoning } from '../contracts/CompositeReasoning';
import { ArlConfidence } from '../contracts/Confidence';
import { DriftImpact } from '../contracts/DriftImpact';
export declare function synthesizeVerdict(packet: ReasoningPacket, scores: EvidenceScore[], contradictions: ContradictionAnalysis, coherence: CoherenceScore, semantic: SemanticAlignment, temporal: TemporalConsistency, causal: CausalReasoning, narrative: NarrativeImpact, composite: CompositeReasoning, confidence: ArlConfidence, drift: DriftImpact): ReasoningVerdict;
//# sourceMappingURL=VerdictSynthesizer.d.ts.map