import { BaseExtractor } from "./base-extractor";
export class ImageAnalyzer extends BaseExtractor {
    async extract(input) {
        const prompt = await this.buildPrompt("image_analysis_v1", {
            filename: input.filename,
            mime: input.mime,
        });
        return {
            type: "image_analysis",
            prompt,
            metadata: {
                filename: input.filename,
                mime: input.mime,
            },
        };
    }
}
//# sourceMappingURL=imageAnalyzer.js.map