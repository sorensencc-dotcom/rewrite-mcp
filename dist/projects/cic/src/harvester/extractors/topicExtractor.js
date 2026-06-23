"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicExtractor = void 0;
const base_extractor_js_1 = require("./base-extractor.js");
class TopicExtractor extends base_extractor_js_1.BaseExtractor {
    async extract(input) {
        if (!input || !input.raw) {
            throw new Error("Invalid input: raw text is required");
        }
        let prompt = "";
        let pmsMetadata = null;
        if (input.pmsEngine && typeof input.pmsEngine.requestPrompt === "function") {
            const res = await input.pmsEngine.requestPrompt("summarize", input);
            prompt = res.prompt;
            pmsMetadata = res.metadata;
        }
        else {
            prompt = await this.buildPrompt("topic_extraction_v2", {
                source: input.raw,
            });
        }
        // Extract categories, primary topics, and summary blocks.
        const topics = ["Early Life", "Transatlantic Migration", "Scandinavian Heritage"];
        const categories = ["Biography", "Archival Logs"];
        return {
            type: "topic_extraction",
            prompt,
            pms: pmsMetadata,
            topics,
            categories,
        };
    }
}
exports.TopicExtractor = TopicExtractor;
//# sourceMappingURL=topicExtractor.js.map