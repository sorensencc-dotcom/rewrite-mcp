import { BaseExtractor } from "./base-extractor";

export class TextExtractor extends BaseExtractor {
  async extract(input: any) {
    const prompt = await this.buildPrompt("text_analysis_v1", {
      length: String(input.raw.length),
    });

    return {
      type: "text_analysis",
      prompt,
      text: input.raw,
    };
  }
}
