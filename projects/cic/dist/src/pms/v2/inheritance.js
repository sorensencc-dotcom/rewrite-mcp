/**
 * projects/cic/src/pms/v2/inheritance.ts
 * Resolves template inheritance and compiles overridable block blocks.
 */
import { InheritanceResolutionError } from "./errors.js";
export class InheritanceResolver {
    /**
     * Recursively resolves parental inheritance and compiles blocks.
     * Visited set is maintained to detect circular inheritance paths.
     */
    resolve(template, allTemplates, visited = new Set()) {
        const tid = template.template_id;
        if (visited.has(tid)) {
            throw new InheritanceResolutionError(`Circular template inheritance detected: ${Array.from(visited).join(" -> ")} -> ${tid}`);
        }
        visited.add(tid);
        // Base case: No parent template defined
        if (!template.parent) {
            return template.template || "";
        }
        // Parental lookup
        const parentTemplate = allTemplates.get(template.parent);
        if (!parentTemplate) {
            throw new InheritanceResolutionError(`Parent template '${template.parent}' not found in registry for template '${tid}'`);
        }
        // Recursive parent compilation
        const parentBody = this.resolve(parentTemplate, allTemplates, visited);
        // Overriding block replacements: [[block:block_name]]content[[endblock]]
        const blockRegex = /\[\[block:([a-zA-Z0-9_]+?)\]\]([\s\S]*?)\[\[endblock\]\]/g;
        let resolvedBody = parentBody;
        resolvedBody = resolvedBody.replace(blockRegex, (match, blockName, defaultContent) => {
            // If the descendant overrides this block, use its content
            if (template.blocks && template.blocks[blockName] !== undefined) {
                return template.blocks[blockName];
            }
            // Otherwise, keep the parent's default content
            return defaultContent;
        });
        return resolvedBody;
    }
}
export const inheritanceResolver = new InheritanceResolver();
//# sourceMappingURL=inheritance.js.map