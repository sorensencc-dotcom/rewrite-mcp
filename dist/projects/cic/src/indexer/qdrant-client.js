"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantClient = void 0;
const qdrant_mock_js_1 = require("./qdrant-mock.js");
class QdrantClient {
    constructor(collection = "cic_semantic") {
        this.useMock = true;
        this.collectionName = "cic_semantic";
        this.collectionName = collection;
    }
    async createCollection() {
        if (this.useMock) {
            return qdrant_mock_js_1.qdrantMock.createCollection(this.collectionName);
        }
        return true;
    }
    async ensureCollection() {
        return this.createCollection();
    }
    async upsert(points) {
        if (this.useMock) {
            return qdrant_mock_js_1.qdrantMock.upsert(this.collectionName, points);
        }
        return true;
    }
    async search(vector, limit = 10, filters) {
        if (this.useMock) {
            return qdrant_mock_js_1.qdrantMock.search(this.collectionName, vector, limit);
        }
        return [];
    }
    async getHealth() {
        if (this.useMock) {
            return qdrant_mock_js_1.qdrantMock.getHealth(this.collectionName);
        }
        return { status: "unknown", vectors: 0 };
    }
    async getCollectionInfo() {
        return this.getHealth();
    }
}
exports.QdrantClient = QdrantClient;
//# sourceMappingURL=qdrant-client.js.map