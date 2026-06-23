import { ConsolidatedKnowledgeObject, KnowledgeGraphPatch } from './phase-25-memory-consolidation.js';
import { TorqueQueryIngestionBundle } from './phase-26-torquequery-schema.js';
export declare class Phase25To26Adapter {
    toTorqueBundle(ckos: ConsolidatedKnowledgeObject[], kgp: KnowledgeGraphPatch): TorqueQueryIngestionBundle;
    private typeOrder;
    private normalizeCkoType;
    private validateBundle;
}
