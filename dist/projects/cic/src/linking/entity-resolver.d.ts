/**
 * Entity normalization, alias resolution, and stable identity resolution with persistence and lineage.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */
import { SemanticEntity } from "../harvester/extractors/v2/extractor-v2.types.js";
export declare function canonicalizeName(name: string): string;
export declare function getComparisonKey(name: string): string;
export declare function getLevenshteinDistance(s1: string, s2: string): number;
export declare function getStringSimilarity(s1: string, s2: string): number;
export declare class EntityResolver {
    private tenantRegistries;
    private tenantAliasMaps;
    constructor();
    private getRegistry;
    private getAliasMap;
    private getTenantPath;
    load(filePath?: string, tenantId?: string): void;
    save(filePath?: string, tenantId?: string): void;
    resolve(raw: {
        name: string;
        type: string;
        context?: string;
        confidence?: number;
        docId?: string;
    }, tenantId?: string): SemanticEntity;
    getCanonicalEntities(tenantId?: string): SemanticEntity[];
    clear(tenantId?: string): void;
}
export declare const entityResolver: EntityResolver;
//# sourceMappingURL=entity-resolver.d.ts.map