import { IExtractor } from "./iextractor.js";
import { multiStageOrchestrator, StageType } from "../../pms/v2/multi-stage.js";

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
      throw new Error("Invalid raw text for extractor chain execution");
    }

    let context: any = {
      raw: rawText,
      pmsEngine: this.pms
    };
    const results: any[] = [];

    for (const extractor of this.chain) {
      const output = await extractor.extract(context);
      results.push(output);
      
      // Thread context down the chain to achieve multi-pass contextual enrichment
      context = {
        ...context,
        ...output,
        pmsEngine: this.pms // Ensure request engine helper is preserved
      };
    }


    return {
      chain_execution: "completed",
      timestamp: new Date().toISOString(),
      results,
      final_payload: context
    };
  }
}

