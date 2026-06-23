/**
 * Synchronous inline Qdrant indexing client and hybrid text matching store.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */
export declare class VectorIndex {
    private pipeline;
    private tenantClients;
    private tenantKeywordStores;
    constructor(defaultCollection?: string);
    private getClient;
    private getKeywordStore;
    upsert(doc: any, tenantId?: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    hybridSearch(query: string, limit?: number, tenantId?: string): Promise<any[]>;
    indexSemanticDocument(doc: any, tenantId?: string): Promise<void>;
    searchSemantic(query: string, topK?: number, tenantId?: string): Promise<any[]>;
    getAllDocuments(tenantId?: string): any[];
    getHealth(tenantId?: string): Promise<any>;
}
//# sourceMappingURL=vector-index.d.ts.map