"use strict";
/**
 * projects/cic/src/reasoning/retrieval-planner.ts
 * Parses queries/goals to compile a detailed, bounded indexing and graph traversal plan.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrievalPlanner = exports.RetrievalPlanner = void 0;
const entity_resolver_js_1 = require("../linking/entity-resolver.js");
class RetrievalPlanner {
    plan(query, context) {
        const vectorQueries = [];
        const graphQueries = [];
        const limit = context?.maxDocuments ?? 5;
        const maxTokens = context?.maxTokens ?? 4096;
        // 1. Core query is always added as a vector query
        vectorQueries.push({ query, limit });
        // 2. Identify potential entity names in the query
        // Simple entity trigger detection: check if query contains resolved entity names in the registry
        const canonicalEntities = entity_resolver_js_1.entityResolver.getCanonicalEntities();
        for (const ent of canonicalEntities) {
            const escapedName = ent.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`\\b${escapedName}\\b`, "i");
            if (regex.test(query)) {
                // Plan a neighborhood traversal for this entity
                graphQueries.push({
                    startEntityId: ent.id,
                    depth: 2
                });
                // Also add a targeted vector search for this entity
                vectorQueries.push({
                    query: ent.name,
                    limit: 3
                });
            }
        }
        // Deduplicate vector queries
        const seenQueries = new Set();
        const uniqueVectorQueries = vectorQueries.filter(vq => {
            const key = vq.query.toLowerCase().trim();
            if (seenQueries.has(key))
                return false;
            seenQueries.add(key);
            return true;
        });
        return {
            query,
            vectorQueries: uniqueVectorQueries,
            graphQueries,
            evidenceBudget: {
                maxDocuments: limit,
                maxTokens
            },
            temporalSlice: context?.timeWindow
        };
    }
}
exports.RetrievalPlanner = RetrievalPlanner;
exports.retrievalPlanner = new RetrievalPlanner();
//# sourceMappingURL=retrieval-planner.js.map