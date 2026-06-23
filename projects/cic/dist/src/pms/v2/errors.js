/**
 * projects/cic/src/pms/v2/errors.ts
 * Deterministic error types for PMS v2 template failure modes.
 */
export class PMSError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class TemplateNotFoundError extends PMSError {
    constructor(templateId) {
        super(`Template '${templateId}' not found in registry.`);
    }
}
export class CompositionValidationError extends PMSError {
    constructor(message) {
        super(`Validation failed for template: ${message}`);
    }
}
export class InheritanceResolutionError extends PMSError {
    constructor(message) {
        super(`Inheritance resolution failed: ${message}`);
    }
}
export class ConditionalEvaluationError extends PMSError {
    constructor(message) {
        super(`Conditional block evaluation failed: ${message}`);
    }
}
export class MissingVariableError extends PMSError {
    constructor(varName) {
        super(`Required prompt template variable is missing: {${varName}}`);
    }
}
//# sourceMappingURL=errors.js.map