"use strict";
/**
 * projects/cic/src/harvester/extractors/v2/extractor-v2.errors.ts
 * Extractor v2 Custom Errors - v1.2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSchemaError = exports.ExtractorError = void 0;
class ExtractorError extends Error {
    constructor(message, stage) {
        super(message);
        this.stage = stage;
        this.name = "ExtractorError";
    }
}
exports.ExtractorError = ExtractorError;
class SemanticSchemaError extends ExtractorError {
    constructor(message, stage, payload) {
        super(message, stage);
        this.payload = payload;
        this.name = "SemanticSchemaError";
    }
}
exports.SemanticSchemaError = SemanticSchemaError;
//# sourceMappingURL=extractor-v2.errors.js.map