import express, { Request, Response } from "express";
import { PMSTemplateRegistry } from "../../pms/pms.template-registry.js";
import { orchestrator } from "../../rtk/automation/orchestrator.js";
import { VectorIndex } from "../../indexer/vector-index.js";
import { graphBuilder } from "../../linking/graph-builder.js";
import { entityResolver } from "../../linking/entity-resolver.js";
import { pmsComposer } from "../../pms/v2/composer.js";
import { reasoningOrchestrator } from "../../reasoning/reasoning-orchestrator.js";
import { reasonTraceManager } from "../../reasoning/reason-trace.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotDir = path.resolve(__dirname, "../../data/snapshots");
const traceDir = path.resolve(__dirname, "../../data/traces");

export const router = express.Router();
const pmsRegistry = new PMSTemplateRegistry();
pmsRegistry.load();

const vectorIndex = new VectorIndex();

router.get("/pms/templates", (req: Request, res: Response) => {
  const templates = [...pmsRegistry["templates"].values()];
  res.json({ templates });
});

router.post("/pms/resolve", async (req: Request, res: Response) => {
  try {
    const { templateId, vars } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: "Missing required parameter: templateId" });
    }
    const resolved = await pmsComposer.resolve(templateId, vars || {});
    res.json(resolved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rtk/automation/state", (req: Request, res: Response) => {
  res.json(orchestrator.getStateTracker().getState());
});

router.get("/index/health", async (req: Request, res: Response) => {
  try {
    const health = await vectorIndex.getHealth();
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/index/search", async (req: Request, res: Response) => {
  try {
    const { query, limit, top_k } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing required parameter: query" });
    }
    const finalLimit = top_k !== undefined ? Number(top_k) : (limit !== undefined ? Number(limit) : undefined);
    const results = await vectorIndex.searchSemantic(query, finalLimit);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/graph/entity/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const neighborhood = graphBuilder.getEntityNeighborhood(id as string);
    res.json(neighborhood);
  } catch (err: any) {
    if (err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/graph/document/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const neighborhood = graphBuilder.getDocumentNeighborhood(id as string);
    res.json(neighborhood);
  } catch (err: any) {
    if (err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/graph/summary", (req: Request, res: Response) => {
  try {
    const summary = graphBuilder.getSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function for GraphQL-style BFS traversal
function traverseGraph(startId: string, maxDepth: number = 2, edgeTypes?: string[]) {
  const visited = new Set<string>([startId]);
  const resultNodes: any[] = [];
  const resultEdges: any[] = [];
  
  let queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    // Is it an entity or document?
    const isEntity = current.id.startsWith("ent_") || current.id.startsWith("ent-");
    
    if (isEntity) {
      try {
        const neighborhood = graphBuilder.getEntityNeighborhood(current.id);
        
        // Add start node metadata if depth is 0
        if (!resultNodes.some(n => n.id === current.id)) {
          resultNodes.push(neighborhood.entity);
        }
        
        // Check documents
        for (const doc of neighborhood.documents) {
          if (edgeTypes && !edgeTypes.includes("docEntityLink")) continue;
          
          if (!visited.has(doc.docId)) {
            visited.add(doc.docId);
            queue.push({ id: doc.docId, depth: current.depth + 1 });
          }
          resultEdges.push({
            id: `${current.id}->${doc.docId}`,
            source: current.id,
            target: doc.docId,
            type: "docEntityLink"
          });
        }
        
        // Check relationships
        for (const rel of neighborhood.relationships) {
          if (edgeTypes && !edgeTypes.includes(rel.predicate)) continue;
          
          if (!visited.has(rel.targetEntityId)) {
            visited.add(rel.targetEntityId);
            queue.push({ id: rel.targetEntityId, depth: current.depth + 1 });
          }
          resultEdges.push({
            id: `${current.id}->${rel.targetEntityId}:${rel.predicate}`,
            source: current.id,
            target: rel.targetEntityId,
            type: rel.predicate,
            details: rel.details,
            confidence: rel.confidence
          });
        }
      } catch {
        // Ignored
      }
    } else {
      // It is a document
      try {
        const neighborhood = graphBuilder.getDocumentNeighborhood(current.id);
        if (!resultNodes.some(n => n.id === current.id)) {
          resultNodes.push(neighborhood.document);
        }
        
        // Check entities in this document
        for (const ent of neighborhood.entities) {
          if (edgeTypes && !edgeTypes.includes("docEntityLink")) continue;
          
          if (!visited.has(ent.id)) {
            visited.add(ent.id);
            queue.push({ id: ent.id, depth: current.depth + 1 });
          }
          resultEdges.push({
            id: `${current.id}->${ent.id}`,
            source: current.id,
            target: ent.id,
            type: "docEntityLink"
          });
        }
        
        // Check related documents
        for (const relDoc of neighborhood.relatedDocuments) {
          if (edgeTypes && !edgeTypes.includes(relDoc.type)) continue;
          
          if (!visited.has(relDoc.docId)) {
            visited.add(relDoc.docId);
            queue.push({ id: relDoc.docId, depth: current.depth + 1 });
          }
          resultEdges.push({
            id: `${current.id}->${relDoc.docId}:${relDoc.type}`,
            source: current.id,
            target: relDoc.docId,
            type: relDoc.type,
            details: relDoc.details,
            confidence: relDoc.confidence
          });
        }
      } catch {
        // Ignored
      }
    }
  }
  
  return { nodes: resultNodes, edges: resultEdges };
}

// 1. POST /graph/query endpoint for GraphQL-style traversal, filtering and temporal slicing
router.post("/graph/query", (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query payload" });
    }

    const { type, filter, traverse } = query;

    if (type === "slice") {
      if (!filter || !filter.timestamp) {
        return res.status(400).json({ error: "Missing required parameter filter.timestamp for slice query" });
      }
      const sliceResult = graphBuilder.sliceAtDate(filter.timestamp);
      return res.json({ slice: sliceResult });
    }

    if (type === "traversal") {
      if (!filter || !filter.id) {
        return res.status(400).json({ error: "Missing required parameter filter.id for traversal query" });
      }
      const depth = traverse?.depth !== undefined ? Number(traverse.depth) : 2;
      const edgeTypes = traverse?.edgeTypes;
      const traversalResult = traverseGraph(filter.id, depth, edgeTypes);
      return res.json(traversalResult);
    }

    return res.status(400).json({ error: `Unsupported query type '${type}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /graph/snapshot for manual snapshot triggers
router.post("/graph/snapshot", async (req: Request, res: Response) => {
  try {
    const { tag } = req.body;
    const snapshotPath = await graphBuilder.createSnapshot(tag);
    res.json({ ok: true, snapshotPath: path.basename(snapshotPath) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /graph/snapshot/list for getting a list of saved snapshots
router.get("/graph/snapshot/list", (req: Request, res: Response) => {
  try {
    if (fs.existsSync(snapshotDir)) {
      const files = fs.readdirSync(snapshotDir).filter(f => f.endsWith(".json"));
      res.json({ snapshots: files });
    } else {
      res.json({ snapshots: [] });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAG PERSISTENCE EXTENSIONS (v1.3.2) ---

// 4. POST /graph/persist/flush: Flushes memory caches to files
router.post("/graph/persist/flush", (req: Request, res: Response) => {
  try {
    entityResolver.save();
    graphBuilder.save();
    res.json({ ok: true, message: "Persisted state flushed atomically to disk." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /graph/persist/stats: Retrieves persist sizing and stats
router.get("/graph/persist/stats", (req: Request, res: Response) => {
  try {
    const summary = graphBuilder.getSummary();
    const entityCount = entityResolver.getCanonicalEntities().length;
    const snapshotCount = fs.existsSync(snapshotDir) ? fs.readdirSync(snapshotDir).filter(f => f.endsWith(".json")).length : 0;
    const traceCount = fs.existsSync(traceDir) ? fs.readdirSync(traceDir).filter(f => f.endsWith(".json")).length : 0;
    
    res.json({
      entity_registry_size: entityCount,
      relationship_count: summary.edges.entityRelationships,
      cross_doc_link_count: summary.edges.crossDocLinks,
      document_count: summary.nodes.documents,
      snapshot_count: snapshotCount,
      trace_count: traceCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /graph/persist/snapshot: Directly trigger a persist snapshot
router.post("/graph/persist/snapshot", async (req: Request, res: Response) => {
  try {
    const { tag } = req.body;
    const snapshotPath = await graphBuilder.createSnapshot(tag);
    res.json({ ok: true, snapshotPath: path.basename(snapshotPath) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RETRIEVAL-AUGMENTED REASONING ENDPOINTS (v1.3.2) ---

// 7. POST /reason/query: Triggers multi-hop RAG loops and returns trace
router.post("/reason/query", async (req: Request, res: Response) => {
  try {
    const { query, timeWindow, maxDocuments, maxTokens } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing required parameter: query" });
    }
    const trace = await reasoningOrchestrator.reason(query, { timeWindow, maxDocuments, maxTokens });
    res.json(trace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /reason/trace/:id: Fetches full audit trace by ID
router.get("/reason/trace/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trace = reasonTraceManager.load(id as string);
    if (!trace) {
      return res.status(404).json({ error: `Reasoning trace '${id}' not found.` });
    }
    res.json(trace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /reason/replay: Re-runs planning/evaluation with original constraints
router.post("/reason/replay", async (req: Request, res: Response) => {
  try {
    const { traceId, maxDocuments, maxTokens } = req.body;
    if (!traceId) {
      return res.status(400).json({ error: "Missing required parameter: traceId" });
    }
    const originalTrace = reasonTraceManager.load(traceId as string);
    if (!originalTrace) {
      return res.status(404).json({ error: `Original trace '${traceId}' not found for replay.` });
    }
    const limit = maxDocuments !== undefined ? maxDocuments : originalTrace.plan.evidenceBudget.maxDocuments;
    const tokens = maxTokens !== undefined ? maxTokens : originalTrace.plan.evidenceBudget.maxTokens;
    
    const replayedTrace = await reasoningOrchestrator.reason(originalTrace.query, {
      timeWindow: originalTrace.plan.temporalSlice,
      maxDocuments: limit,
      maxTokens: tokens
    });
    res.json({ ok: true, replayedTrace });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
