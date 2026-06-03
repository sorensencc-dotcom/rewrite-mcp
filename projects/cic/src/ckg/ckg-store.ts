// File: projects/cic/src/ckg/ckg-store.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";

export interface CkgNode {
  id: string;
  type: string;
  name: string;
  tags?: string[];
  meta?: Record<string, any>;
}

export interface CkgEdge {
  from: string;
  to: string;
  type: string;
  meta?: Record<string, any>;
}

export interface CkgGraph {
  nodes: CkgNode[];
  edges: CkgEdge[];
  meta?: {
    hotspots?: {
      centralNodes: CkgNode[];
      orphans: CkgNode[];
    };
    drift?: {
      unmappedSkills: any[];
      stateDiscrepancies: any[];
    };
    lastUpdated?: string;
  };
}

export class CkgStore {
  constructor(private graphPath: string) {}

  public load(): CkgGraph {
    if (!fs.existsSync(this.graphPath)) {
      return { nodes: [], edges: [] };
    }
    try {
      const raw = fs.readFileSync(this.graphPath, "utf8");
      return JSON.parse(raw) as CkgGraph;
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  public save(graph: CkgGraph): void {
    const dir = path.dirname(this.graphPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    graph.meta = {
      ...graph.meta,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(this.graphPath, JSON.stringify(graph, null, 2), "utf8");
  }

  public appendNode(node: CkgNode): void {
    const graph = this.load();
    const existingIdx = graph.nodes.findIndex(n => n.id === node.id);
    if (existingIdx !== -1) {
      graph.nodes[existingIdx] = {
        ...graph.nodes[existingIdx],
        ...node,
        tags: Array.from(new Set([...(graph.nodes[existingIdx].tags || []), ...(node.tags || [])]))
      };
    } else {
      graph.nodes.push(node);
    }
    this.save(graph);
  }

  public appendEdge(edge: CkgEdge): void {
    const graph = this.load();
    const edgeExists = graph.edges.some(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );
    if (!edgeExists) {
      graph.edges.push(edge);
    }
    this.save(graph);
  }

  public getNeighborhood(nodeId: string, maxDepth: number = 2): CkgGraph {
    const graph = this.load();
    const visited = new Set<string>([nodeId]);
    const resultNodes: CkgNode[] = [];
    const resultEdges: CkgEdge[] = [];
    const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];

    const startNode = graph.nodes.find(n => n.id === nodeId);
    if (startNode) {
      resultNodes.push(startNode);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      // Find edges connected to the current node
      const connectedEdges = graph.edges.filter(
        e => e.from === current.id || e.to === current.id
      );

      for (const edge of connectedEdges) {
        const neighborId = edge.from === current.id ? edge.to : edge.from;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighborNode = graph.nodes.find(n => n.id === neighborId);
          if (neighborNode) {
            resultNodes.push(neighborNode);
            queue.push({ id: neighborId, depth: current.depth + 1 });
          }
        }

        // Keep the edge in our neighborhood output
        if (!resultEdges.some(re => re.from === edge.from && re.to === edge.to && re.type === edge.type)) {
          resultEdges.push(edge);
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }
}
