/**
 * projects/cic/src/harvester/extractors/v2/extractor-v2.errors.ts
 * Extractor v2 Custom Errors - v1.2.0
 */

export class ExtractorError extends Error {
  constructor(message: string, public readonly stage: string) {
    super(message);
    this.name = "ExtractorError";
  }
}

export class SemanticSchemaError extends ExtractorError {
  constructor(message: string, stage: string, public readonly payload: any) {
    super(message, stage);
    this.name = "SemanticSchemaError";
  }
}
