/**
 * projects/cic/src/pms/v2/composer.ts
 * Main PMS v2 composer and resolver.
 */
import { PMSTemplateRegistry } from "../pms.template-registry.js";
export interface IndexLookup {
    getTopNSnippets(query: string, limit?: number): Promise<string[]>;
}
export declare class RateLimitedIndexLookup implements IndexLookup {
    private lastCall;
    private minIntervalMs;
    getTopNSnippets(query: string, limit?: number): Promise<string[]>;
}
export declare class PMSComposer {
    private registry;
    private indexLookup;
    constructor(registry?: PMSTemplateRegistry, indexLookup?: IndexLookup);
    initialize(): void;
    /**
     * Resolves, inherits, conditional-evaluates, and substitutes variables.
     * Isolates template resolution errors inside the returned metadata.
     */
    resolve(templateId: string, vars: Record<string, any>): Promise<{
        prompt: string;
        metadata: any;
    }>;
    getRegistry(): PMSTemplateRegistry;
}
export declare const pmsComposer: PMSComposer;
//# sourceMappingURL=composer.d.ts.map