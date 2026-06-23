"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Harvester = void 0;
const extractor_chain_js_1 = require("./extractors/extractor-chain.js");
const semanticExtractor_js_1 = require("./extractors/semanticExtractor.js");
const relationshipExtractor_js_1 = require("./extractors/relationshipExtractor.js");
const topicExtractor_js_1 = require("./extractors/topicExtractor.js");
const vector_index_js_1 = require("../indexer/vector-index.js");
const entity_resolver_js_1 = require("../linking/entity-resolver.js");
const link_engine_js_1 = require("../linking/link-engine.js");
const graph_builder_js_1 = require("../linking/graph-builder.js");
const metrics_collector_js_1 = require("../reasoning/metrics-collector.js");
class Harvester {
    constructor() {
        this.registry = new Map();
        this.vectorIndex = new vector_index_js_1.VectorIndex();
    }
    register(type, extractor) {
        this.registry.set(type, extractor);
    }
    async run(job) {
        if (job.type === "semantic") {
            const chain = new extractor_chain_js_1.ExtractorChain();
            chain
                .add(new semanticExtractor_js_1.SemanticExtractor())
                .add(new relationshipExtractor_js_1.RelationshipExtractor())
                .add(new topicExtractor_js_1.TopicExtractor());
            const chainResult = await chain.run(job.payload.raw);
            const doc = {
                docId: job.payload.docId || undefined,
                rawText: job.payload.raw,
                entities: chainResult.final_payload.entities || [],
                relationships: chainResult.final_payload.relationships || [],
                topics: chainResult.final_payload.topics || [],
                summary: "Semantic Ingestion Summary",
                timestamp: new Date().toISOString()
            };
            // Perform synchronous inline Qdrant upsert to preserve transaction integrity
            let indexResult = await this.vectorIndex.upsert(doc);
            // --- Post-Index Linking & Graph Hook ---
            // 1. Resolve Entities to canonical entities with stable IDs, passing docId for lineage tracking
            const resolvedEntities = doc.entities.map((e) => {
                const resolved = entity_resolver_js_1.entityResolver.resolve({ ...e, docId: doc.docId });
                return {
                    ...e,
                    id: resolved.id,
                    lineage: resolved.lineage
                };
            });
            doc.entities = resolvedEntities;
            // 2. Resolve Relationship subjects/objects to stable entity IDs using comparison keys
            const findResolvedId = (name) => {
                const key = (0, entity_resolver_js_1.getComparisonKey)(name);
                const found = resolvedEntities.find((re) => (0, entity_resolver_js_1.getComparisonKey)(re.name) === key);
                if (found)
                    return found.id;
                return entity_resolver_js_1.entityResolver.resolve({ name, type: "PEOPLE", docId: doc.docId }).id;
            };
            for (const rel of doc.relationships) {
                if (rel.subject) {
                    rel.subjectId = findResolvedId(rel.subject);
                }
                if (rel.object) {
                    rel.objectId = findResolvedId(rel.object);
                }
            }
            // 3. Compute cross-document links
            const allDocs = this.vectorIndex.getAllDocuments();
            const links = link_engine_js_1.linkEngine.computeLinks(doc, allDocs);
            // 4. Update the in-memory graph
            graph_builder_js_1.graphBuilder.addDocumentGraph(doc, links);
            // Auto-save the updated entity registry and graph stores to disk
            entity_resolver_js_1.entityResolver.save();
            graph_builder_js_1.graphBuilder.save();
            // 5. Enrich Payload and Re-upsert to VectorIndex
            doc.entity_ids = resolvedEntities.map((e) => e.id);
            doc.link_count = links.length;
            doc.primary_topics = doc.topics.map((t) => typeof t === "string" ? t : t.topic);
            indexResult = await this.vectorIndex.upsert(doc);
            return {
                ...chainResult.final_payload,
                entities: resolvedEntities,
                relationships: doc.relationships,
                entity_ids: doc.entity_ids,
                link_count: doc.link_count,
                primary_topics: doc.primary_topics,
                type: "semantic_ingestion",
                chain_execution: "completed",
                index_status: indexResult.ok ? "synced" : "failed",
                docId: indexResult.id,
                pms: {
                    template: chainResult.final_payload.pms?.templateId || null,
                    version: chainResult.final_payload.pms?.version || null,
                    error: chainResult.final_payload.pms?.error || null,
                }
            };
        }
        try {
            const extractor = this.registry.get(job.type);
            if (!extractor) {
                throw new Error(`Extractor for job type ${job.type} not found`);
            }
            const result = await extractor.extract(job.payload);
            // Attach PMS prompt metadata for downstream stages
            result.pms = {
                template: result.pms?.templateId || result.prompt?.templateId || null,
                version: result.pms?.version || result.prompt?.version || null,
                error: result.pms?.error || null,
            };
            return result;
        }
        catch (err) {
            metrics_collector_js_1.metricsCollector.recordIngestionError();
            throw err;
        }
    }
}
exports.Harvester = Harvester;
//# sourceMappingURL=harvester.js.map