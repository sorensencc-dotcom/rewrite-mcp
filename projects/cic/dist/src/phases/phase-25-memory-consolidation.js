// filename: phase-25-memory-consolidation.ts
// Phase 25 — Memory Consolidation Layer (MCL)
// Transforms raw memory shards into stable, queryable, cross-linked knowledge objects
import { v4 as uuidv4 } from 'uuid';
export class Phase25MemoryConsolidation {
    constructor(config) {
        this.ckoRegistry = new Map();
        this.entityIndex = new Map();
        this.config = config;
    }
    run(normalizedEntries) {
        const consolidatedCkos = this.consolidate(normalizedEntries);
        const dedupedCkos = this.deduplicateAndGuardDrift(consolidatedCkos);
        const linkedCkos = this.crossLink(dedupedCkos);
        const stableCkos = this.applyStabilityPass(linkedCkos);
        const kgp = this.buildPatch(stableCkos);
        return {
            ckos: stableCkos,
            kgp,
        };
    }
    consolidate(entries) {
        const ckos = [];
        const groupedByEntity = this.groupEntitiesBySimilarity(entries);
        for (const [entityKey, group] of groupedByEntity.entries()) {
            const merged = this.determinativeMerge(group);
            if (merged) {
                ckos.push(merged);
                this.ckoRegistry.set(merged.id, merged);
            }
        }
        return ckos;
    }
    groupEntitiesBySimilarity(entries) {
        const groups = new Map();
        for (const entry of entries) {
            const entityName = entry.payload.entity || entry.id;
            if (!groups.has(entityName)) {
                groups.set(entityName, []);
            }
            groups.get(entityName).push(entry);
        }
        return groups;
    }
    determinativeMerge(entries) {
        if (entries.length === 0)
            return null;
        const weighted = entries.sort((a, b) => b.confidence - a.confidence);
        const primary = weighted[0];
        const ckoId = `cko:${primary.type}:${uuidv4()}`;
        const mergedAttributes = this.weightedAttributeFusion(weighted);
        return {
            id: ckoId,
            type: (primary.payload.type || 'entity'),
            attributes: mergedAttributes,
            sources: entries.map(e => e.id),
            confidence: this.averageConfidence(weighted),
            version: 1,
            links: [],
            stability: 'TENTATIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    weightedAttributeFusion(entries) {
        const result = {};
        const attrWeights = new Map();
        for (const entry of entries) {
            for (const [key, value] of Object.entries(entry.payload)) {
                if (!attrWeights.has(key)) {
                    attrWeights.set(key, []);
                }
                attrWeights.get(key).push({ value, weight: entry.confidence });
            }
        }
        for (const [key, candidates] of attrWeights.entries()) {
            const weighted = candidates.sort((a, b) => b.weight - a.weight);
            result[key] = weighted[0].value;
        }
        return result;
    }
    averageConfidence(entries) {
        const sum = entries.reduce((acc, e) => acc + e.confidence, 0);
        return Math.min(1.0, sum / entries.length);
    }
    deduplicateAndGuardDrift(ckos) {
        const deduplicated = [];
        const seenFingerprints = new Set();
        for (const cko of ckos) {
            const fingerprint = this.semanticFingerprint(cko);
            if (seenFingerprints.has(fingerprint)) {
                continue;
            }
            seenFingerprints.add(fingerprint);
            const drift = this.calculateDrift(cko);
            if (drift < this.config.driftThreshold) {
                deduplicated.push(cko);
            }
        }
        return deduplicated;
    }
    semanticFingerprint(cko) {
        const core = `${cko.type}:${JSON.stringify(cko.attributes)}`;
        return Buffer.from(core).toString('base64').substring(0, 32);
    }
    calculateDrift(cko) {
        if (cko.sources.length < 2)
            return 0;
        const sourceConfidences = cko.sources.length;
        const driftScore = 1.0 - cko.confidence;
        return Math.min(1.0, driftScore * (sourceConfidences / 10));
    }
    crossLink(ckos) {
        const edgeCount = new Map();
        for (const cko1 of ckos) {
            for (const cko2 of ckos) {
                if (cko1.id === cko2.id)
                    continue;
                if (this.shouldLink(cko1, cko2)) {
                    if (!cko1.links.includes(cko2.id)) {
                        cko1.links.push(cko2.id);
                        edgeCount.set(cko1.id, (edgeCount.get(cko1.id) || 0) + 1);
                    }
                }
            }
        }
        return ckos;
    }
    shouldLink(cko1, cko2) {
        const name1 = cko1.attributes.name || '';
        const name2 = cko2.attributes.name || '';
        if (name1 && name2 && name1.toLowerCase().includes(name2.toLowerCase())) {
            return true;
        }
        const contextSimilarity = this.contextOverlap(cko1.attributes, cko2.attributes);
        return contextSimilarity > 0.6;
    }
    contextOverlap(attrs1, attrs2) {
        const keys1 = new Set(Object.keys(attrs1));
        const keys2 = new Set(Object.keys(attrs2));
        const intersection = new Set([...keys1].filter(k => keys2.has(k)));
        return intersection.size / Math.max(keys1.size, keys2.size, 1);
    }
    applyStabilityPass(ckos) {
        return ckos.map(cko => {
            const isStable = cko.confidence >= this.config.minConfidenceStable &&
                cko.links.length >= this.config.minCrossLinksStable;
            return {
                ...cko,
                stability: isStable ? 'STABLE' : 'TENTATIVE',
            };
        });
    }
    buildPatch(ckos) {
        const edges = [];
        for (const cko of ckos) {
            for (const linkedId of cko.links) {
                edges.push({
                    from: cko.id,
                    to: linkedId,
                    type: 'references',
                });
            }
        }
        return {
            patch_id: `kgp:25:${Date.now()}`,
            nodes_added: ckos.map(cko => ({
                id: cko.id,
                type: cko.type,
                attributes: cko.attributes,
                version: cko.version,
                stability: cko.stability,
            })),
            edges_added: edges,
            nodes_updated: [],
            nodes_removed: [],
            created_at: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=phase-25-memory-consolidation.js.map