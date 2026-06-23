export declare class QdrantClient {
    private useMock;
    private collectionName;
    constructor(collection?: string);
    createCollection(): Promise<boolean>;
    ensureCollection(): Promise<boolean>;
    upsert(points: {
        id: string;
        vector: number[];
        payload: any;
    }[]): Promise<boolean>;
    search(vector: number[], limit?: number, filters?: any): Promise<any[]>;
    getHealth(): Promise<any>;
    getCollectionInfo(): Promise<any>;
}
//# sourceMappingURL=qdrant-client.d.ts.map