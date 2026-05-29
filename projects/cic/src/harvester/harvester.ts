import { IExtractor } from "./extractors/iextractor";

export class Harvester {
  private registry: Map<string, IExtractor> = new Map();

  register(type: string, extractor: IExtractor) {
    this.registry.set(type, extractor);
  }

  async run(job: { type: string; payload: any }) {
    const extractor = this.registry.get(job.type);
    if (!extractor) {
      throw new Error(`Extractor for job type ${job.type} not found`);
    }

    const result = await extractor.extract(job.payload);

    // Attach PMS prompt metadata for downstream stages
    result.pms = {
      template: result.prompt?.templateId ?? null,
      version: result.prompt?.version ?? null,
    };

    return result;
  }
}
