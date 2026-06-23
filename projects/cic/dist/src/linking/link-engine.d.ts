/**
 * projects/cic/src/linking/link-engine.ts
 * Computes cross-document semantic links based on shared entities, topics, co-occurrences, and explicit references.
 */
import { SemanticDocument } from "../harvester/extractors/v2/extractor-v2.types.js";
export interface CrossDocumentLink {
    id: string;
    sourceDocId: string;
    targetDocId: string;
    type: "same_entity" | "related_topic" | "co_occurs_with" | "references";
    sourceEntityId?: string;
    targetEntityId?: string;
    sharedTopic?: string;
    confidence: number;
    details: string;
}
export declare class LinkEngine {
    computeLinks(doc: SemanticDocument, allDocs: SemanticDocument[]): CrossDocumentLink[];
}
export declare const linkEngine: LinkEngine;
