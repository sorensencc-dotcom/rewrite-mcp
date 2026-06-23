"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageAnalyzer = void 0;
const base_extractor_1 = require("./base-extractor");
class ImageAnalyzer extends base_extractor_1.BaseExtractor {
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
exports.ImageAnalyzer = ImageAnalyzer;
//# sourceMappingURL=imageAnalyzer.js.map