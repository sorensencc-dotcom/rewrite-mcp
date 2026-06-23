export declare class EmbeddingPipeline {
    private dimension;
    generateEmbedding(text: string): Promise<number[]>;
    embedText(text: string): Promise<number[]>;
    embedDocument(doc: any): Promise<number[]>;
}
//# sourceMappingURL=embedding-pipeline.d.ts.map