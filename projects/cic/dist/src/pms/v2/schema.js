/**
 * projects/cic/src/pms/v2/schema.ts
 * Type definitions and validators for compositional v2 templates.
 */
import { CompositionValidationError } from "./errors.js";
/**
 * Validates a parsed template object against the v2 compositional rules.
 * Throws a CompositionValidationError if invalid.
 */
export function validateTemplateV2(parsed) {
    if (!parsed || typeof parsed !== "object") {
        throw new CompositionValidationError("Template is not a valid JSON/YAML object");
    }
    const requiredFields = ["template_id", "name", "version", "extractor_type", "content_type"];
    for (const field of requiredFields) {
        if (!parsed[field] || typeof parsed[field] !== "string") {
            throw new CompositionValidationError(`Missing or invalid required field: '${field}'`);
        }
    }
    // Ensure that the template is present unless there is a parent reference to inherit from
    if (!parsed.template && !parsed.parent) {
        throw new CompositionValidationError("Template must specify either a 'template' body or a 'parent' reference to inherit from");
    }
    // Optional block validation
    if (parsed.blocks && typeof parsed.blocks !== "object") {
        throw new CompositionValidationError("'blocks' property must be a dictionary/object mapping block names to override strings");
    }
    // Optional stage validation
    if (parsed.stages && typeof parsed.stages !== "object") {
        throw new CompositionValidationError("'stages' property must be a dictionary/object mapping stage names to template strings");
    }
    return parsed;
}
//# sourceMappingURL=schema.js.map