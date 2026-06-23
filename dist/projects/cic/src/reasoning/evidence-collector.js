"use strict";
/**
 * projects/cic/src/reasoning/evidence-collector.ts
 * Executes retrieval plans by querying vector indexes and traversing historical graph slices.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceCollector = exports.EvidenceCollector = void 0;
const vector_index_js_1 = require("../indexer/vector-index.js");
const graph_builder_js_1 = require("../linking/graph-builder.js");
class EvidenceCollector {
    constructor() {
        this.vectorIndex = new vector_index_js_1.VectorIndex();
    }
    async collect(plan) {
        const evidence = [];
        const seenIds = new Set();
        // 1. Determine active graph scope
        let activeGraph = graph_builder_js_1.graphBuilder;
        if (plan.temporalSlice) {
            // Reconstruct historical sliced graph at dateX dynamically!
            const slice = graph_builder_js_1.graphBuilder.sliceAtDate(plan.temporalSlice);
            const tempGraph = new graph_builder_js_1.GraphBuilder();
            for (const doc of slice.documents) {
                // Find links associated with this document from the slice
                const docLinks = slice.crossDocLinks.filter(l => l.sourceDocId === doc.docId || l.targetDocId === doc.docId);
                tempGraph.addDocumentGraph(doc, docLinks);
            }
            activeGraph = tempGraph;
        }
        // 2. Execute vector queries
        for (const vq of plan.vectorQueries) {
            try {
                const results = await this.vectorIndex.searchSemantic(vq.query, vq.limit);
                for (const item of results) {
                    if (seenIds.has(item.id))
                        continue;
                    // If temporal filtering is active, skip documents indexed after target date
                    if (plan.temporalSlice) {
                        const docTs = item.payload.timestamp ? new Date(item.payload.timestamp).getTime() : 0;
                        const limitTs = new Date(plan.temporalSlice).getTime();
                        if (docTs > limitTs)
                            continue;
                    }
                    seenIds.add(item.id);
                    evidence.push({
                        id: item.id,
                        type: "document",
                        score: item.rrf_score ?? 0.8,
                        text: item.payload.rawText || "",
                        provenance: item.id,
                        timestamp: item.payload.timestamp || new Date().toISOString()
                    });
                }
            }
            catch (err) {
                console.error(`[EvidenceCollector] Vector search failed for "${vq.query}":`, err.message);
            }
        }
        // 3. Execute graph traversal neighborhood expansions
        for (const gq of plan.graphQueries) {
            try {
                const neighborhood = activeGraph.getEntityNeighborhood(gq.startEntityId);
                // Add starting entity itself if not seen
                const entKey = `ent:${neighborhood.entity.id}`;
                if (!seenIds.has(entKey)) {
                    seenIds.add(entKey);
                    evidence.push({
                        id: neighborhood.entity.id,
                        type: "entity",
                        score: 0.95 * neighborhood.entity.confidence,
                        text: `Entity: "${neighborhood.entity.name}" | Type: ${neighborhood.entity.type} | Context: ${neighborhood.entity.context}`,
                        provenance: `registry`,
                        timestamp: new Date().toISOString()
                    });
                }
                // Fetch connected documents in neighborhood
                for (const doc of neighborhood.documents) {
                    if (seenIds.has(doc.docId))
                        continue;
                    // Re-lookup rawText from indexer to preserve complete content
                    const allDocs = this.vectorIndex.getAllDocuments();
                    const foundIndexDoc = allDocs.find(d => d.docId === doc.docId);
                    const rawText = foundIndexDoc ? foundIndexDoc.rawText : doc.summary;
                    seenIds.add(doc.docId);
                    evidence.push({
                        id: doc.docId,
                        type: "document",
                        score: 0.9,
                        text: rawText,
                        provenance: doc.docId,
                        timestamp: doc.timestamp
                    });
                }
                // Fetch relationship details
                for (const rel of neighborhood.relationships) {
                    const relKey = `rel:${neighborhood.entity.id}-${rel.predicate}-${rel.targetEntityId}`;
                    if (seenIds.has(relKey))
                        continue;
                    seenIds.add(relKey);
                    evidence.push({
                        id: relKey,
                        type: "relationship",
                        score: 0.85 * rel.confidence,
                        text: `Fact: "${neighborhood.entity.name}" is ${rel.predicate} "${rel.targetEntityName}". Details: ${rel.details}`,
                        provenance: `neighborhood_traversal`,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch {
                // Entity not found in this graph scope (e.g. not created yet at slice dateX)
            }
        }
        // 4. Sort and cap based on plan evidence budget
        const sortedEvidence = evidence.sort((a, b) => b.score - a.score);
        return sortedEvidence.slice(0, plan.evidenceBudget.maxDocuments);
    }
}
exports.EvidenceCollector = EvidenceCollector;
exports.evidenceCollector = new EvidenceCollector();
//# sourceMappingURL=evidence-collector.js.map