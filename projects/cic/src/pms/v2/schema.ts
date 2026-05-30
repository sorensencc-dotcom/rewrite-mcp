/**
 * projects/cic/src/pms/v2/schema.ts
 * Type definitions and validators for compositional v2 templates.
 */

import { PMSTemplate } from "../types.js";
import { CompositionValidationError } from "./errors.js";

export interface TemplateV2 extends Omit<Partial<PMSTemplate>, "extractor_type"> {
  template_id: string;
  name: string;
  version: string;
  extractor_type: "vision" | "ocr" | "reverse_image" | "custom" | string;

  content_type: string;
  
  // V2 Composition extensions
  parent?: string;
  blocks?: Record<string, string>;
  stages?: Record<string, string>;
}

/**
 * Validates a parsed template object against the v2 compositional rules.
 * Throws a CompositionValidationError if invalid.
 */
export function validateTemplateV2(parsed: any): TemplateV2 {
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

  return parsed as TemplateV2;
}
