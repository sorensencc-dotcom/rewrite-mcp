import { ExtractorChain } from "./extractors/extractor-chain.js";
import { SemanticExtractor } from "./extractors/semanticExtractor.js";
import { RelationshipExtractor } from "./extractors/relationshipExtractor.js";
import { TopicExtractor } from "./extractors/topicExtractor.js";
import { VectorIndex } from "../indexer/vector-index.js";
import { entityResolver, getComparisonKey } from "../linking/entity-resolver.js";
import { linkEngine } from "../linking/link-engine.js";
import { graphBuilder } from "../linking/graph-builder.js";
import { metricsCollector } from "../reasoning/metrics-collector.js";
export class Harvester {
    constructor() {
        this.registry = new Map();
        this.vectorIndex = new VectorIndex();
    }
    register(type, extractor) {
        this.registry.set(type, extractor);
    }
    async run(job) {
        if (job.type === "semantic") {
            const chain = new ExtractorChain();
            chain
                .add(new SemanticExtractor())
                .add(new RelationshipExtractor())
                .add(new TopicExtractor());
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
                const resolved = entityResolver.resolve({ ...e, docId: doc.docId });
                return {
                    ...e,
                    id: resolved.id,
                    lineage: resolved.lineage
                };
            });
            doc.entities = resolvedEntities;
            // 2. Resolve Relationship subjects/objects to stable entity IDs using comparison keys
            const findResolvedId = (name) => {
                const key = getComparisonKey(name);
                const found = resolvedEntities.find((re) => getComparisonKey(re.name) === key);
                if (found)
                    return found.id;
                return entityResolver.resolve({ name, type: "PEOPLE", docId: doc.docId }).id;
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
            const links = linkEngine.computeLinks(doc, allDocs);
            // 4. Update the in-memory graph
            graphBuilder.addDocumentGraph(doc, links);
            // Auto-save the updated entity registry and graph stores to disk
            entityResolver.save();
            graphBuilder.save();
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
            metricsCollector.recordIngestionError();
            throw err;
        }
    }
}
//# sourceMappingURL=harvester.js.map