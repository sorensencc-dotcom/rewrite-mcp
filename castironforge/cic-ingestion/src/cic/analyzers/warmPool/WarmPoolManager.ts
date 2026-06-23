// WarmPoolManager.ts
// Stub implementation for testing image analyzer v2
// Production: Link to full WarmPoolManager from cic/src/extractors/browser/

export interface WarmModel {
  name: string;
  version: string;
  analyzeImageStreaming(filePath: string): AsyncIterable<any>;
  analyzeImageBatch(filePath: string): Promise<any>;
  getGpuMemoryUsageMB(): Promise<number>;
  release(): Promise<void>;
}

export class WarmPoolManager {
  private models: Map<string, WarmModel> = new Map();
  private available: boolean = true;

  async healthCheck(): Promise<boolean> {
    return this.available;
  }

  async acquireModel(name: string): Promise<WarmModel> {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model ${name} not found in pool`);
    }
    return model;
  }

  async releaseModel(model: WarmModel): Promise<void> {
    await model.release();
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  registerModel(name: string, model: WarmModel): void {
    this.models.set(name, model);
  }
}
