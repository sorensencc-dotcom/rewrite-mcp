/**
 * projects/cic/src/pms/v2/errors.ts
 * Deterministic error types for PMS v2 template failure modes.
 */
export declare class PMSError extends Error {
    constructor(message: string);
}
export declare class TemplateNotFoundError extends PMSError {
    constructor(templateId: string);
}
export declare class CompositionValidationError extends PMSError {
    constructor(message: string);
}
export declare class InheritanceResolutionError extends PMSError {
    constructor(message: string);
}
export declare class ConditionalEvaluationError extends PMSError {
    constructor(message: string);
}
export declare class MissingVariableError extends PMSError {
    constructor(varName: string);
}
