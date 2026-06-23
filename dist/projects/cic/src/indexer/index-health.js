"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexHealth = void 0;
const qdrant_client_js_1 = require("./qdrant-client.js");
class IndexHealth {
    constructor(collection = "cic_semantic") {
        this.client = new qdrant_client_js_1.QdrantClient(collection);
    }
    async report() {
        return this.client.getHealth();
    }
}
exports.IndexHealth = IndexHealth;
//# sourceMappingURL=index-health.js.map