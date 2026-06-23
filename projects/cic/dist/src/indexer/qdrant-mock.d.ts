/**
 * projects/cic/src/indexer/qdrant-mock.ts
 * High-fidelity in-process Qdrant mock server for indexing.
 */
export declare class QdrantMock {
    private collections;
    private lastUpsertTimestamp;
    createCollection(name: string): Promise<boolean>;
    upsert(collection: string, points: {
        id: string;
        vector: number[];
        payload: any;
    }[]): Promise<boolean>;
    search(collection: string, vector: number[], limit?: number): Promise<any[]>;
    getHealth(collection: string): Promise<any>;
    reset(): void;
}
export declare const qdrantMock: QdrantMock;
