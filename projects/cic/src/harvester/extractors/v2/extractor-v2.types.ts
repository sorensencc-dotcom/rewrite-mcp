/**
 * projects/cic/src/harvester/extractors/v2/extractor-v2.types.ts
 * Extractor v2 Semantic Type Definitions - v1.2.0
 */

export interface EntityLineageEntry {
  timestamp: string;
  docId: string;
  action: "created" | "merged_alias" | "context_enriched" | "name_updated";
  originalName?: string;
  contextAdded?: string;
}

export interface SemanticEntity {
  id: string;
  name: string;
  type: "PEOPLE" | "PLACES" | "EVENTS" | "ARTIFACTS";
  context: string;
  confidence: number;
  lineage?: EntityLineageEntry[];
}

export interface SemanticRelationship {
  subjectId: string;
  objectId: string;
  predicate: "born_in" | "child_of" | "worked_at" | "author_of" | "emigrated_from" | "associated_with";
  details: string;
  confidence: number;
}

export interface TopicVector {
  topic: string;
  weight: number; // 0.0 to 1.0
  category: string;
}

export interface SemanticDocument {
  docId: string;
  rawText: string;
  entities: SemanticEntity[];
  relationships: SemanticRelationship[];
  topics: TopicVector[];
  summary: string;
  timestamp: string;
}

export interface ExtractorPassResult {
  extractorName: string;
  timestamp: string;
  payload: any;
  confidence: number;
}

export interface ExtractorChainResult {
  chainId: string;
  executionStatus: "completed" | "failed";
  runtimeMs: number;
  passes: ExtractorPassResult[];
  semanticDocument: SemanticDocument;
}
