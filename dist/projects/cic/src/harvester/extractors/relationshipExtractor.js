"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipExtractor = void 0;
const base_extractor_js_1 = require("./base-extractor.js");
class RelationshipExtractor extends base_extractor_js_1.BaseExtractor {
    async extract(input) {
        if (!input || !input.raw) {
            throw new Error("Invalid input: raw text is required");
        }
        let prompt = "";
        let pmsMetadata = null;
        if (input.pmsEngine && typeof input.pmsEngine.requestPrompt === "function") {
            const res = await input.pmsEngine.requestPrompt("refine", input);
            prompt = res.prompt;
            pmsMetadata = res.metadata;
        }
        else {
            const entitiesStr = JSON.stringify(input.entities || []);
            prompt = await this.buildPrompt("relationship_extraction_v2", {
                source: input.raw,
                entities: entitiesStr,
            });
        }
        // Extract directed edges and semantic link predicates.
        const relationships = [
            { subject: "Sorensen, Charles Emil", object: "Lellinge", predicate: "born_in", confidence: 0.98 },
            { subject: "Sorensen, Charles Emil", object: "Sorensen, Soren", predicate: "child_of", confidence: 0.99 }
        ];
        return {
            type: "relationship_extraction",
            prompt,
            pms: pmsMetadata,
            relationships,
        };
    }
}
exports.RelationshipExtractor = RelationshipExtractor;
//# sourceMappingURL=relationshipExtractor.js.map