/**
 * projects/cic/src/pms/v2/schema.ts
 * Type definitions and validators for compositional v2 templates.
 */
import { PMSTemplate } from "../types.js";
export interface TemplateV2 extends Omit<Partial<PMSTemplate>, "extractor_type"> {
    template_id: string;
    name: string;
    version: string;
    extractor_type: "vision" | "ocr" | "reverse_image" | "custom" | string;
    content_type: string;
    parent?: string;
    blocks?: Record<string, string>;
    stages?: Record<string, string>;
}
/**
 * Validates a parsed template object against the v2 compositional rules.
 * Throws a CompositionValidationError if invalid.
 */
export declare function validateTemplateV2(parsed: any): TemplateV2;
//# sourceMappingURL=schema.d.ts.map