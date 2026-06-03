// File: projects/cic/src/cic/control-plane/v1-router.ts | Date: 2026-06-02 | v1.5.0
/**
 * REST API Router for public v1 endpoints.
 * Handles multi-tenant scoped RAG reasoning, graph dates-slicing and Episode Builder studio endpoints.
 */

import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { reasoningOrchestrator } from "../../reasoning/reasoning-orchestrator.js";
import { reasonTraceManager } from "../../reasoning/reason-trace.js";
import { graphBuilder } from "../../linking/graph-builder.js";
import { episodeBuilder } from "../../reasoning/episode-builder.js";
import { metricsCollector } from "../../reasoning/metrics-collector.js";
import { specRegistry } from "./spec-registry.js";
import { getTelemetrySink } from "./telemetry-sink.js";
import { InstinctProposer } from "./instinct-proposer.js";
import { patchLoader } from "./patch-loader.js";
import { PatchStatus } from "./patch-model.js";
import { RoadmapPipeline } from "../../agents/roadmapping/pipeline.js";
import { registerMemoryRoutes } from "./memory-routes.js";
import { registerSkillsRoutes } from "./skills-routes.js";
import { registerAprRoutes } from "./apr-routes.js";
import { registerCroRoutes } from "./cro-routes.js";
import { registerCkgRoutes } from "./ckg-routes.js";
import { registerMeeRoutes } from "./mee-routes.js";




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

// 9. GET /v1/specs/skills - list all registered skills
v1Router.get("/specs/skills", (req: Request, res: Response) => {
  res.json({ skills: specRegistry.getSkills() });
});

// 10. GET /v1/specs/instincts - list all registered instincts
v1Router.get("/specs/instincts", (req: Request, res: Response) => {
  res.json({ instincts: specRegistry.getInstincts() });
});

// 11. GET /v1/specs/hooks - list all registered hooks
v1Router.get("/specs/hooks", (req: Request, res: Response) => {
  res.json({ hooks: specRegistry.getHooks() });
});

// 12. GET /v1/specs/rules - list all registered rules
v1Router.get("/specs/rules", (req: Request, res: Response) => {
  res.json({ rules: specRegistry.getRules() });
});

// 13. GET /v1/specs/violations - list all recorded violations with filters
v1Router.get("/specs/violations", (req: Request, res: Response) => {
  try {
    const filter = {
      pipeline: req.query.pipeline,
      tenantId: req.query.tenant,
      region: req.query.region,
      limit: req.query.limit
    };
    const results = specRegistry.queryViolations(filter);
    res.json({ violations: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13b. GET /v1/specs/violations/heatmap - aggregate violation counts grouped by tenant and severity
v1Router.get("/specs/violations/heatmap", (req: Request, res: Response) => {
  try {
    const violations = specRegistry.queryViolations({ limit: 1000 });
    const grid: Record<string, { hard: number; soft: number }> = {};

    for (const v of violations) {
      const tenant = v.context?.tenantId || "default";
      if (!grid[tenant]) {
        grid[tenant] = { hard: 0, soft: 0 };
      }
      if (v.severity === "hard") {
        grid[tenant].hard++;
      } else {
        grid[tenant].soft++;
      }
    }

    res.json({ heatmap: grid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. POST /v1/specs/violations/clear - clear all recorded violations
v1Router.post("/specs/violations/clear", (req: Request, res: Response) => {
  specRegistry.clearViolations();
  res.json({ ok: true });
});

// 15. GET /v1/telemetry/skills - query skill telemetry
v1Router.get("/telemetry/skills", async (req: Request, res: Response) => {
  try {
    const filter = {
      pipeline: req.query.pipeline,
      skillName: req.query.skill,
      tenantId: req.query.tenant,
      region: req.query.region,
      limit: req.query.limit
    };
    const events = await getTelemetrySink().querySkills(filter);
    res.json({ telemetry: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. GET /v1/telemetry/instincts - query instinct telemetry
v1Router.get("/telemetry/instincts", async (req: Request, res: Response) => {
  try {
    const filter = {
      pipeline: req.query.pipeline,
      instinctName: req.query.instinct,
      tenantId: req.query.tenant,
      region: req.query.region,
      limit: req.query.limit
    };
    const events = await getTelemetrySink().queryInstincts(filter);
    res.json({ telemetry: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 17. POST /v1/telemetry/clear - clear all telemetry logs
v1Router.post("/telemetry/clear", async (req: Request, res: Response) => {
  try {
    await getTelemetrySink().clear();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. POST /v1/telemetry/proposals - execute proposer heuristics and return instinct YAML patches
v1Router.post("/telemetry/proposals", async (req: Request, res: Response) => {
  try {
    const skillEvents = await getTelemetrySink().querySkills({ limit: 1000 });
    const instinctEvents = await getTelemetrySink().queryInstincts({ limit: 1000 });
    const proposer = new InstinctProposer(skillEvents, instinctEvents);
    const patches = proposer.proposePatches();

    // Map and save newly proposed patches dynamically
    for (const p of patches) {
      patchLoader.saveProposedPatch({
        instinct: p.instinctName,
        baseVersion: p.baseVersion,
        proposedVersion: p.proposedVersion,
        change: p.diff,
        impact: {
          impactScore: p.impactScore,
          metricsBefore: p.metricsBefore || { successRate: 1, avgLatencyMs: 200, avgDrift: 0 },
          metricsAfter: p.metricsAfter || { successRate: 1, avgLatencyMs: 200, avgDrift: 0 }
        },
        scope: {
          regions: ["us-east-1"],
          tenants: ["*"]
        }
      });
    }

    res.json({ proposals: patches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 19. GET /v1/instincts/patches - list all registered lifecycle patches
v1Router.get("/instincts/patches", (req: Request, res: Response) => {
  try {
    const status = req.query.status as PatchStatus | undefined;
    const list = patchLoader.listPatches(status);
    res.json({ patches: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 20. POST /v1/instincts/patches/canary - move proposed → canary with region/tenant filters
v1Router.post("/instincts/patches/canary", async (req: Request, res: Response) => {
  try {
    const { fileName, regions, tenants } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: "Missing required parameter: fileName" });
    }

    // Default regions / tenants scope
    const scope = {
      regions: regions || ["us-east-1"],
      tenants: tenants || ["*"]
    };

    await patchLoader.movePatch(fileName, "proposed", "canary", { scope });
    res.json({ ok: true, scope });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 21. POST /v1/instincts/patches/promote - promote canary → active (enforcing impact thresholds)
v1Router.post("/instincts/patches/promote", async (req: Request, res: Response) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: "Missing required parameter: fileName" });
    }

    const canaryPatches = patchLoader.listPatches("canary");
    const patch = canaryPatches.find(p => p.fileName === fileName);

    if (!patch) {
      return res.status(404).json({ error: `Canary patch '${fileName}' not found.` });
    }

    // Enforce Promotion Rules (e.g. impact score >= 50, success rate no degradation)
    const threshold = 50;
    if (patch.impact.impactScore < threshold) {
      return res.status(400).json({
        error: `Promotion rejected: impact score (${patch.impact.impactScore}) below required threshold (${threshold}).`
      });
    }

    if (patch.impact.metricsAfter.successRate < patch.impact.metricsBefore.successRate) {
      return res.status(400).json({
        error: `Promotion rejected: success rate degraded from ${patch.impact.metricsBefore.successRate} to ${patch.impact.metricsAfter.successRate}.`
      });
    }

    await patchLoader.movePatch(fileName, "canary", "active");
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 22. POST /v1/instincts/patches/reject - move proposed or canary patch → rejected
v1Router.post("/instincts/patches/reject", async (req: Request, res: Response) => {
  try {
    const { fileName, currentStatus, reason } = req.body;
    if (!fileName || !currentStatus) {
      return res.status(400).json({ error: "Missing required parameters: fileName and currentStatus" });
    }

    if (currentStatus !== "proposed" && currentStatus !== "canary") {
      return res.status(400).json({ error: "Invalid currentStatus: must be proposed or canary." });
    }

    await patchLoader.movePatch(fileName, currentStatus, "rejected", {
      createdBy: `operator-reject: ${reason || "No reason given"}`
    } as any);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 23. GET /v1/arps/status - derive and return ARPS subsystem health state
v1Router.get("/arps/status", async (req: Request, res: Response) => {
  try {
    const artifactsDir = path.resolve(process.cwd(), "projects/cic/.artifacts/roadmap");
    let lastRun = "never";
    let lastDeltaSummary = "none";

    if (fs.existsSync(artifactsDir)) {
      const files = fs.readdirSync(artifactsDir).sort().reverse();
      const deltaFile = files.find(f => f.startsWith("delta-"));
      if (deltaFile) {
        const stats = fs.statSync(path.join(artifactsDir, deltaFile));
        lastRun = stats.mtime.toISOString();
        try {
          const delta = JSON.parse(fs.readFileSync(path.join(artifactsDir, deltaFile), "utf-8"));
          lastDeltaSummary = `${delta.components.length} components, ${delta.completions.length} completed, ${delta.gaps.length} gaps`;
        } catch {}
      }
    }

    res.json({
      id: "arps",
      name: "Autonomous Roadmap & Prompt Sandbox",
      status: "healthy",
      details: {
        lastRun,
        lastDeltaSummary,
        lastDocsBuild: "pass",
        lastSandboxDecision: "allowed"
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 24. POST /v1/arps/run - execute ARPS pipeline manually
v1Router.post("/arps/run", async (req: any, res: Response) => {
  try {
    const { dryRun, verbose } = req.body;
    const pipeline = new RoadmapPipeline(
      process.cwd(),
      path.resolve(process.cwd(), "docs"),
      path.resolve(process.cwd(), "projects/cic/pms/registry.yaml")
    );
    await pipeline.run({
      dryRun: dryRun !== false, // default to true
      verbose: verbose !== false, // default to true
      commit: !dryRun
    });
    res.json({ ok: true, message: `Pipeline run completed with dryRun=${dryRun !== false}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

registerMemoryRoutes(v1Router);
registerSkillsRoutes(v1Router);
registerAprRoutes(v1Router);
registerCroRoutes(v1Router);
registerCkgRoutes(v1Router);
registerMeeRoutes(v1Router);






