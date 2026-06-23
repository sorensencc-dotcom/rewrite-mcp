"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextExtractor = void 0;
const base_extractor_1 = require("./base-extractor");
class TextExtractor extends base_extractor_1.BaseExtractor {
    async extract(input) {
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
exports.TextExtractor = TextExtractor;
//# sourceMappingURL=textExtractor.js.map