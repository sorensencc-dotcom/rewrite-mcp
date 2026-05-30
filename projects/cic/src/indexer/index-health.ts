import { QdrantClient } from "./qdrant-client.js";

export class IndexHealth {
  private client: QdrantClient;

  constructor(collection: string = "cic_semantic") {
    this.client = new QdrantClient(collection);
  }

  async report(): Promise<any> {
    return this.client.getHealth();
  }
}
