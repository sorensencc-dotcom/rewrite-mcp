import { IExtractor } from "./iextractor.js";
import { multiStageOrchestrator, StageType } from "../../pms/v2/multi-stage.js";
import { metricsCollector } from "../../reasoning/metrics-collector.js";

export class ExtractorChain {
  private chain: IExtractor[] = [];

  public pms = {
    requestPrompt: async (stage: StageType, context: any) => {
      return multiStageOrchestrator.requestPrompt(stage, context);
    }
  };

  add(extractor: IExtractor): this {
    this.chain.push(extractor);
    return this;
  }

  async run(rawText: string): Promise<any> {
    if (!rawText) {
      metricsCollector.recordIngestionError();
      throw new Error("Invalid raw text for extractor chain execution");
    }

    let context: any = {
      raw: rawText,
      pmsEngine: this.pms
    };
    const results: any[] = [];
    const latencies: any = {};
    const chainStart = Date.now();

    try {
      for (const extractor of this.chain) {
        const tStart = Date.now();
        const output = await extractor.extract(context);
        const duration = Date.now() - tStart;

        const name = extractor.constructor.name;
        if (name === "SemanticExtractor") latencies.semantic = duration;
        else if (name === "RelationshipExtractor") latencies.relationship = duration;
        else if (name === "TopicExtractor") latencies.topic = duration;
        else if (name === "ReasoningExtractor") latencies.reasoning = duration;

        results.push(output);
        
        // Thread context down the chain to achieve multi-pass contextual enrichment
        context = {
          ...context,
          ...output,
          pmsEngine: this.pms // Ensure request engine helper is preserved
        };
      }

      const chainDuration = Date.now() - chainStart;
      metricsCollector.recordIngestion(chainDuration, latencies);
    } catch (err) {
      metricsCollector.recordIngestionError();
      throw err;
    }

    return {
      chain_execution: "completed",
      timestamp: new Date().toISOString(),
      results,
      final_payload: context
    };
  }
}


