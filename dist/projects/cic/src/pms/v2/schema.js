"use strict";
/**
 * projects/cic/src/pms/v2/schema.ts
 * Type definitions and validators for compositional v2 templates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTemplateV2 = validateTemplateV2;
const errors_js_1 = require("./errors.js");
/**
 * Validates a parsed template object against the v2 compositional rules.
 * Throws a CompositionValidationError if invalid.
 */
function validateTemplateV2(parsed) {
    if (!parsed || typeof parsed !== "object") {
        throw new errors_js_1.CompositionValidationError("Template is not a valid JSON/YAML object");
    }
    const requiredFields = ["template_id", "name", "version", "extractor_type", "content_type"];
    for (const field of requiredFields) {
        if (!parsed[field] || typeof parsed[field] !== "string") {
            throw new errors_js_1.CompositionValidationError(`Missing or invalid required field: '${field}'`);
        }
    }
    // Ensure that the template is present unless there is a parent reference to inherit from
    if (!parsed.template && !parsed.parent) {
        throw new errors_js_1.CompositionValidationError("Template must specify either a 'template' body or a 'parent' reference to inherit from");
    }
    // Optional block validation
    if (parsed.blocks && typeof parsed.blocks !== "object") {
        throw new errors_js_1.CompositionValidationError("'blocks' property must be a dictionary/object mapping block names to override strings");
    }
    // Optional stage validation
    if (parsed.stages && typeof parsed.stages !== "object") {
        throw new errors_js_1.CompositionValidationError("'stages' property must be a dictionary/object mapping stage names to template strings");
    }
    return parsed;
}
//# sourceMappingURL=schema.js.map