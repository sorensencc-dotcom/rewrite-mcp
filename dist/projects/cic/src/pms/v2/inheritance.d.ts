/**
 * projects/cic/src/pms/v2/inheritance.ts
 * Resolves template inheritance and compiles overridable block blocks.
 */
import { TemplateV2 } from "./schema.js";
export declare class InheritanceResolver {
    /**
     * Recursively resolves parental inheritance and compiles blocks.
     * Visited set is maintained to detect circular inheritance paths.
     */
    resolve(template: TemplateV2, allTemplates: Map<string, TemplateV2>, visited?: Set<string>): string;
}
export declare const inheritanceResolver: InheritanceResolver;
//# sourceMappingURL=inheritance.d.ts.map