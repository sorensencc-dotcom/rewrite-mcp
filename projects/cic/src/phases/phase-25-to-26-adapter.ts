// filename: phase-25-to-26-adapter.ts
// Adapter: Phase 25 (Memory Consolidation) → Phase 26 (TorqueQuery)
// Transforms CKOs + KGP into deterministic TorqueQuery ingestion bundles

import {
  ConsolidatedKnowledgeObject,
  KnowledgeGraphPatch,
} from './phase-25-memory-consolidation.js';
import {
  TorqueQueryIngestionBundle,
  TorqueNode,
  TorqueEdge,
  TorqueNodeType,
} from './phase-26-torquequery-schema.js';

export class Phase25To26Adapter {
  toTorqueBundle(
    ckos: ConsolidatedKnowledgeObject[],
    kgp: KnowledgeGraphPatch
  ): TorqueQueryIngestionBundle {
    // Filter: only STABLE CKOs are ingested
    const stableCkos = ckos.filter(c => c.stability === 'STABLE');

    // Sort deterministically: entities → events → locations → timelines
    const sorted = stableCkos.sort((a, b) => this.typeOrder(a.type) - this.typeOrder(b.type));

    // Transform CKOs to TorqueNodes
    const nodes: TorqueNode[] = sorted.map(cko => ({
      id: cko.id,
      type: this.normalizeCkoType(cko.type),
      attributes: cko.attributes,
      version: cko.version,
      stability: 'STABLE' as const,
    }));

    // Build valid edge set (no dangling edges)
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: TorqueEdge[] = kgp.edges_added
      .filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
      .filter(e => e.from !== e.to); // no self-loops

    // Validate bundle integrity
    this.validateBundle(nodes, edges);

    return {
      bundle_id: `tq-bundle:${Date.now()}`,
      nodes,
      edges,
      manifest: {
        source_phase: 25,
        patch_id: kgp.patch_id,
        created_at: new Date().toISOString(),
      },
    };
  }

  private typeOrder(type: string): number {
    const order: Record<string, number> = {
      entity: 1,
      event: 2,
      location: 3,
      timeline: 4,
    };
    return order[type] ?? 99;
  }

  private normalizeCkoType(type: any): TorqueNodeType {
    const normalized = type.toString().toLowerCase();
    if (['entity', 'event', 'location', 'timeline'].includes(normalized)) {
      return normalized as TorqueNodeType;
    }
    return 'entity';
  }

  private validateBundle(nodes: TorqueNode[], edges: TorqueEdge[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`Dangling edge: from-node ${edge.from} not in bundle`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`Dangling edge: to-node ${edge.to} not in bundle`);
      }
    }

    const uniqueIds = new Set(nodes.map(n => n.id));
    if (uniqueIds.size !== nodes.length) {
      throw new Error('Duplicate node IDs in bundle');
    }
  }
}
