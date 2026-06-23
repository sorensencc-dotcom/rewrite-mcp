/**
 * projects/cic/src/reasoning/retrieval-planner.ts
 * Parses queries/goals to compile a detailed, bounded indexing and graph traversal plan.
 */
import { entityResolver } from "../linking/entity-resolver.js";
export class RetrievalPlanner {
    plan(query, context) {
        const vectorQueries = [];
        const graphQueries = [];
        const limit = context?.maxDocuments ?? 5;
        const maxTokens = context?.maxTokens ?? 4096;
        // 1. Core query is always added as a vector query
        vectorQueries.push({ query, limit });
        // 2. Identify potential entity names in the query
        // Simple entity trigger detection: check if query contains resolved entity names in the registry
        const canonicalEntities = entityResolver.getCanonicalEntities();
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
export const retrievalPlanner = new RetrievalPlanner();
//# sourceMappingURL=retrieval-planner.js.map