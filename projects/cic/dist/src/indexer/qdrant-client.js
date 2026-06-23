import { qdrantMock } from "./qdrant-mock.js";
export class QdrantClient {
    constructor(collection = "cic_semantic") {
        this.useMock = true;
        this.collectionName = "cic_semantic";
        this.collectionName = collection;
    }
    async createCollection() {
        if (this.useMock) {
            return qdrantMock.createCollection(this.collectionName);
        }
        return true;
    }
    async ensureCollection() {
        return this.createCollection();
    }
    async upsert(points) {
        if (this.useMock) {
            return qdrantMock.upsert(this.collectionName, points);
        }
        return true;
    }
    async search(vector, limit = 10, filters) {
        if (this.useMock) {
            return qdrantMock.search(this.collectionName, vector, limit);
        }
        return [];
    }
    async getHealth() {
        if (this.useMock) {
            return qdrantMock.getHealth(this.collectionName);
        }
        return { status: "unknown", vectors: 0 };
    }
    async getCollectionInfo() {
        return this.getHealth();
    }
}
//# sourceMappingURL=qdrant-client.js.map