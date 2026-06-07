export class EmbeddingPipeline {
  private dimension: number = 1536;

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text) {
      throw new Error("Text content is required for embedding generation");
    }

    const vector: number[] = new Array(this.dimension).fill(0);
    
    // Create a highly deterministic mock embedding from the text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    for (let j = 0; j < this.dimension; j++) {
      const angle = (hash + j) * 0.1;
      vector[j] = Math.sin(angle) * Math.cos(angle * 0.5);
    }

    // Normalize the vector to ensure Cosine distance consistency
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    const normalized = magnitude > 0 ? vector.map(v => v / magnitude) : vector;

    return normalized;
  }

  async embedText(text: string): Promise<number[]> {
    return this.generateEmbedding(text);
  }

  async embedDocument(doc: any): Promise<number[]> {
    if (!doc) {
      throw new Error("Document is required for embedding");
    }
    const text = doc.rawText || doc.text || doc.raw || "";
    return this.generateEmbedding(text);
  }
}
