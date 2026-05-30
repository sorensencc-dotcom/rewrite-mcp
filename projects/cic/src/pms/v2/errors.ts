/**
 * projects/cic/src/pms/v2/errors.ts
 * Deterministic error types for PMS v2 template failure modes.
 */

export class PMSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TemplateNotFoundError extends PMSError {
  constructor(templateId: string) {
    super(`Template '${templateId}' not found in registry.`);
  }
}

export class CompositionValidationError extends PMSError {
  constructor(message: string) {
    super(`Validation failed for template: ${message}`);
  }
}

export class InheritanceResolutionError extends PMSError {
  constructor(message: string) {
    super(`Inheritance resolution failed: ${message}`);
  }
}

export class ConditionalEvaluationError extends PMSError {
  constructor(message: string) {
    super(`Conditional block evaluation failed: ${message}`);
  }
}

export class MissingVariableError extends PMSError {
  constructor(varName: string) {
    super(`Required prompt template variable is missing: {${varName}}`);
  }
}
