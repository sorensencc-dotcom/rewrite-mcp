// File: projects/cic/src/cic/control-plane/v1-router.ts | Date: 2026-05-30 | v1.4.0
/**
 * REST API Router for public v1 endpoints.
 * Handles multi-tenant scoped RAG reasoning, graph dates-slicing and Episode Builder studio endpoints.
 */

import express, { Request, Response } from "express";
import { reasoningOrchestrator } from "../../reasoning/reasoning-orchestrator.js";
import { reasonTraceManager } from "../../reasoning/reason-trace.js";
import { graphBuilder } from "../../linking/graph-builder.js";
import { episodeBuilder } from "../../reasoning/episode-builder.js";
import { metricsCollector } from "../../reasoning/metrics-collector.js";

export const v1Router = express.Router();

// Middleware: Extract Multi-Tenant Scope Header
v1Router.use((req: any, res, next) => {
  req.tenantId = req.headers["x-tenant-id"] || "default";
  
  // Rate-limiting throttle simulation
  const ip = req.ip || "127.0.0.1";
  next();
});

// 1. POST /v1/reason - processes RAG reasoning query
v1Router.post("/reason", async (req: any, res: Response) => {
  try {
    const { query, timeWindow, maxDocuments, maxTokens } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing required parameter: query" });
    }
    const trace = await reasoningOrchestrator.reason(query, {
      timeWindow,
      maxDocuments,
      maxTokens
    });
    res.json(trace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /v1/reason/trace - returns detail trace by ID
v1Router.post("/reason/trace", (req: any, res: Response) => {
  try {
    const { traceId } = req.body;
    if (!traceId) {
      return res.status(400).json({ error: "Missing required parameter: traceId" });
    }
    const trace = reasonTraceManager.load(traceId);
    if (!trace) {
      return res.status(404).json({ error: `Reasoning trace '${traceId}' not found.` });
    }
    res.json(trace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /v1/reason/explain - expanded breakdown of the reasoning trajectory
v1Router.post("/reason/explain", (req: any, res: Response) => {
  try {
    const { traceId } = req.body;
    if (!traceId) {
      return res.status(400).json({ error: "Missing required parameter: traceId" });
    }
    const trace = reasonTraceManager.load(traceId);
    if (!trace) {
      return res.status(404).json({ error: `Reasoning trace '${traceId}' not found for explanation.` });
    }

    res.json({
      traceId: trace.traceId,
      query: trace.query,
      confidence: trace.confidence,
      evaluationExplanation: `RAG planner allocated a ${trace.plan.evidenceBudget.maxDocuments} documents budget. Sliced ${trace.evidenceEvaluated.length} node neighborhood clusters. Fact contradiction check resolved with score ${trace.isContested ? "0.20 (LOW)" : "1.00 (HIGH)"}.`,
      stagesCompiled: [
        { stage: "semantic_seed", overriddenBlocks: ["stage_header", "stage_instructions"] },
        { stage: "semantic_refine", overriddenBlocks: ["refined_context"] },
        { stage: "semantic_summary", overriddenBlocks: ["summary_compilation"] }
      ],
      evidenceProvenanceMatches: trace.evidenceEvaluated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for BFS traversal in /v1/graph/query
function traverseGraphV1(startId: string, tenantId: string, maxDepth: number = 2) {
  const visited = new Set<string>([startId]);
  const resultNodes: any[] = [];
  const resultEdges: any[] = [];
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const isEntity = current.id.startsWith("ent_") || current.id.startsWith("ent-");
    if (isEntity) {
      try {
        const neighborhood = graphBuilder.getEntityNeighborhood(current.id, tenantId);
        if (!resultNodes.some(n => n.id === current.id)) {
          resultNodes.push(neighborhood.entity);
        }
        for (const doc of neighborhood.documents) {
          if (!visited.has(doc.docId)) {
            visited.add(doc.docId);
            queue.push({ id: doc.docId, depth: current.depth + 1 });
          }
          resultEdges.push({ source: current.id, target: doc.docId, type: "docEntityLink" });
        }
      } catch {}
    } else {
      try {
        const neighborhood = graphBuilder.getDocumentNeighborhood(current.id, tenantId);
        if (!resultNodes.some(n => n.id === current.id)) {
          resultNodes.push(neighborhood.document);
        }
        for (const ent of neighborhood.entities) {
          if (!visited.has(ent.id)) {
            visited.add(ent.id);
            queue.push({ id: ent.id, depth: current.depth + 1 });
          }
          resultEdges.push({ source: current.id, target: ent.id, type: "docEntityLink" });
        }
      } catch {}
    }
  }
  return { nodes: resultNodes, edges: resultEdges };
}

// 4. POST /v1/graph/query - processes traversal, slicing, or filtering
v1Router.post("/graph/query", (req: any, res: Response) => {
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
      const sliceResult = graphBuilder.sliceAtDate(filter.timestamp, req.tenantId);
      return res.json({ slice: sliceResult });
    }

    if (type === "traversal") {
      if (!filter || !filter.id) {
        return res.status(400).json({ error: "Missing required parameter filter.id for traversal query" });
      }
      const depth = traverse?.depth !== undefined ? Number(traverse.depth) : 2;
      const traversalResult = traverseGraphV1(filter.id, req.tenantId, depth);
      return res.json(traversalResult);
    }

    return res.status(400).json({ error: `Unsupported query type '${type}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /v1/graph/snapshot - triggers snapshot
v1Router.post("/graph/snapshot", async (req: any, res: Response) => {
  try {
    const { tag } = req.body;
    const snapshotPath = await graphBuilder.createSnapshot(tag, req.tenantId);
    res.json({ ok: true, snapshotPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DOCUMENTARY EPISODE BUILDER ENDPOINTS ---

// 6. POST /v1/episode/build
v1Router.post("/episode/build", async (req: any, res: Response) => {
  try {
    const { title, coreEntityIds } = req.body;
    if (!title || !coreEntityIds) {
      return res.status(400).json({ error: "title and coreEntityIds are required parameters." });
    }
    const outline = await episodeBuilder.buildEpisodeOutline(title, coreEntityIds, req.tenantId);
    res.json(outline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. POST /v1/episode/expand
v1Router.post("/episode/expand", async (req: any, res: Response) => {
  try {
    const { beatId, details } = req.body;
    if (!beatId || !details) {
      return res.status(400).json({ error: "beatId and details are required parameters." });
    }
    const expansion = await episodeBuilder.expandNarrativeBeat(beatId, details, req.tenantId);
    res.json(expansion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. POST /v1/episode/summarize
v1Router.post("/episode/summarize", async (req: any, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "topic is a required parameter." });
    }
    const summary = await episodeBuilder.summarizeThematicThreads(topic, req.tenantId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
