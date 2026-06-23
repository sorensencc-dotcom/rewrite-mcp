/**
 * projects/cic/src/harvester/extractors/v2/extractor-v2.errors.ts
 * Extractor v2 Custom Errors - v1.2.0
 */
export class ExtractorError extends Error {
    constructor(message, stage) {
        super(message);
        this.stage = stage;
        this.name = "ExtractorError";
    }
}
export class SemanticSchemaError extends ExtractorError {
    constructor(message, stage, payload) {
        super(message, stage);
        this.payload = payload;
        this.name = "SemanticSchemaError";
    }
}
//# sourceMappingURL=extractor-v2.errors.js.map