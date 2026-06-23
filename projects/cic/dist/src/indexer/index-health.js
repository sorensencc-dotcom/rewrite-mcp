import { QdrantClient } from "./qdrant-client.js";
export class IndexHealth {
    constructor(collection = "cic_semantic") {
        this.client = new QdrantClient(collection);
    }
    async report() {
        return this.client.getHealth();
    }
}
//# sourceMappingURL=index-health.js.map