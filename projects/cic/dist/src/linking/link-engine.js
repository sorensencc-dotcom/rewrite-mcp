/**
 * projects/cic/src/linking/link-engine.ts
 * Computes cross-document semantic links based on shared entities, topics, co-occurrences, and explicit references.
 */
import crypto from "crypto";
export class LinkEngine {
    computeLinks(doc, allDocs) {
        const links = [];
        const seenLinks = new Set();
        const addLink = (link) => {
            // Avoid duplicate document links of the same type and targets
            const key = `${link.sourceDocId}->${link.targetDocId}:${link.type}:${link.sourceEntityId || ""}:${link.sharedTopic || ""}`;
            if (seenLinks.has(key))
                return;
            seenLinks.add(key);
            const id = "lnk_" + crypto
                .createHash("sha256")
                .update(key + Date.now().toString())
                .digest("hex")
                .slice(0, 16);
            links.push({ id, ...link });
        };
        // Normalize topic vectors from string or array of TopicVector
        const getTopicVectors = (document) => {
            if (!document.topics)
                return [];
            return document.topics.map(t => {
                if (typeof t === "string") {
                    return { topic: t, weight: 1.0, category: "General" };
                }
                return t;
            });
        };
        const docTopics = getTopicVectors(doc);
        for (const other of allDocs) {
            if (other.docId === doc.docId)
                continue;
            // 1. Same Entity Link
            // If two documents share the exact same entity, create a same_entity link.
            const docEntities = doc.entities || [];
            const otherEntities = other.entities || [];
            const sharedEntities = [];
            for (const entA of docEntities) {
                for (const entB of otherEntities) {
                    if (entA.id === entB.id && entA.id) {
                        sharedEntities.push({ thisEnt: entA, otherEnt: entB });
                        const conf = Math.min(1.0, Math.max(0.1, Math.sqrt((entA.confidence || 1.0) * (entB.confidence || 1.0))));
                        addLink({
                            sourceDocId: doc.docId,
                            targetDocId: other.docId,
                            type: "same_entity",
                            sourceEntityId: entA.id,
                            targetEntityId: entB.id,
                            confidence: conf,
                            details: `Both documents reference resolved entity "${entA.name}" (${entA.id}).`
                        });
                    }
                }
            }
            // 2. Co-Occurs With Link
            // If two documents share 2 or more entities, create a co_occurs_with link.
            if (sharedEntities.length >= 2) {
                const entNames = sharedEntities.map(se => `"${se.thisEnt.name}"`).join(", ");
                const baseConf = sharedEntities.length >= 3 ? 0.95 : 0.85;
                addLink({
                    sourceDocId: doc.docId,
                    targetDocId: other.docId,
                    type: "co_occurs_with",
                    confidence: baseConf,
                    details: `Multiple entities (${entNames}) co-occur in both documents.`
                });
            }
            // 3. Related Topic Link
            // If two documents share topics, create a related_topic link.
            const otherTopics = getTopicVectors(other);
            for (const tA of docTopics) {
                for (const tB of otherTopics) {
                    if (tA.topic.toLowerCase() === tB.topic.toLowerCase()) {
                        const conf = Math.min(1.0, Math.max(0.1, Math.sqrt(tA.weight * tB.weight)));
                        addLink({
                            sourceDocId: doc.docId,
                            targetDocId: other.docId,
                            type: "related_topic",
                            sharedTopic: tA.topic,
                            confidence: conf,
                            details: `Shared topic: "${tA.topic}" (Category: ${tA.category || "General"}).`
                        });
                    }
                }
            }
            // 4. References Link
            // If doc text explicitly references other doc's ID, or vice versa.
            const docRaw = (doc.rawText || "").toLowerCase();
            const otherRaw = (other.rawText || "").toLowerCase();
            const docIdClean = doc.docId.toLowerCase();
            const otherIdClean = other.docId.toLowerCase();
            if (docRaw.includes(otherIdClean)) {
                addLink({
                    sourceDocId: doc.docId,
                    targetDocId: other.docId,
                    type: "references",
                    confidence: 0.95,
                    details: `Document explicitly references target document ID "${other.docId}".`
                });
            }
            else if (otherRaw.includes(docIdClean)) {
                addLink({
                    sourceDocId: other.docId,
                    targetDocId: doc.docId,
                    type: "references",
                    confidence: 0.95,
                    details: `Document explicitly references target document ID "${doc.docId}".`
                });
            }
        }
        return links;
    }
}
export const linkEngine = new LinkEngine();
//# sourceMappingURL=link-engine.js.map