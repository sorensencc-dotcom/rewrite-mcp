/**
 * projects/cic/src/harvester/extractors/v2/extractor-v2.errors.ts
 * Extractor v2 Custom Errors - v1.2.0
 */
export declare class ExtractorError extends Error {
    readonly stage: string;
    constructor(message: string, stage: string);
}
export declare class SemanticSchemaError extends ExtractorError {
    readonly payload: any;
    constructor(message: string, stage: string, payload: any);
}
