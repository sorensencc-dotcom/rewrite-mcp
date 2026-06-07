import { qdrantMock } from "./qdrant-mock.js";

export class QdrantClient {
  private useMock: boolean = true;
  private collectionName: string = "cic_semantic";

  constructor(collection: string = "cic_semantic") {
    this.collectionName = collection;
  }

  async createCollection(): Promise<boolean> {
    if (this.useMock) {
      return qdrantMock.createCollection(this.collectionName);
    }
    return true;
  }

  async ensureCollection(): Promise<boolean> {
    return this.createCollection();
  }

  async upsert(points: { id: string; vector: number[]; payload: any }[]): Promise<boolean> {
    if (this.useMock) {
      return qdrantMock.upsert(this.collectionName, points);
    }
    return true;
  }

  async search(vector: number[], limit: number = 10, filters?: any): Promise<any[]> {
    if (this.useMock) {
      return qdrantMock.search(this.collectionName, vector, limit);
    }
    return [];
  }

  async getHealth(): Promise<any> {
    if (this.useMock) {
      return qdrantMock.getHealth(this.collectionName);
    }
    return { status: "unknown", vectors: 0 };
  }

  async getCollectionInfo(): Promise<any> {
    return this.getHealth();
  }
}
