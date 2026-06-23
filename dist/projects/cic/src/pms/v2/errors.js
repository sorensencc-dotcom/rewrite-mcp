"use strict";
/**
 * projects/cic/src/pms/v2/errors.ts
 * Deterministic error types for PMS v2 template failure modes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingVariableError = exports.ConditionalEvaluationError = exports.InheritanceResolutionError = exports.CompositionValidationError = exports.TemplateNotFoundError = exports.PMSError = void 0;
class PMSError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.PMSError = PMSError;
class TemplateNotFoundError extends PMSError {
    constructor(templateId) {
        super(`Template '${templateId}' not found in registry.`);
    }
}
exports.TemplateNotFoundError = TemplateNotFoundError;
class CompositionValidationError extends PMSError {
    constructor(message) {
        super(`Validation failed for template: ${message}`);
    }
}
exports.CompositionValidationError = CompositionValidationError;
class InheritanceResolutionError extends PMSError {
    constructor(message) {
        super(`Inheritance resolution failed: ${message}`);
    }
}
exports.InheritanceResolutionError = InheritanceResolutionError;
class ConditionalEvaluationError extends PMSError {
    constructor(message) {
        super(`Conditional block evaluation failed: ${message}`);
    }
}
exports.ConditionalEvaluationError = ConditionalEvaluationError;
class MissingVariableError extends PMSError {
    constructor(varName) {
        super(`Required prompt template variable is missing: {${varName}}`);
    }
}
exports.MissingVariableError = MissingVariableError;
//# sourceMappingURL=errors.js.map