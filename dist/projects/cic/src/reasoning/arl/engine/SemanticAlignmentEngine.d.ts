/**
 * projects/cic/src/reasoning/arl/engine/SemanticAlignmentEngine.ts
 * Autonomous Reasoning Layer — Semantic Alignment scoring engine.
 *
 * Determines whether a candidate expansion aligns with CIC's semantic universe:
 * entities, concepts, relationships, known patterns, knowledge graph nodes.
 */
import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { SemanticAlignment } from '../contracts/SemanticAlignment';
export declare function computeSemanticAlignment(packet: ReasoningPacket): SemanticAlignment;
//# sourceMappingURL=SemanticAlignmentEngine.d.ts.map