/**
 * CIC Context Service HTTP Server
 * Express server implementing the Context API contract
 */

import express, { Request, Response, NextFunction } from "express";
import { ContextService, ContextServiceConfig } from "./ContextService";
import { TraceMiddleware } from "../observability/TraceMiddleware";
import { MetricsMiddleware } from "../observability/MetricsMiddleware";
import { FlowRegistry } from "../src/ruflo-orchestration/FlowRegistry";
import { FlowOrchestrator } from "../src/ruflo-orchestration/FlowOrchestrator";
import { FlowLoader } from "../src/ruflo-orchestration/FlowLoader";
import { createRealAgents } from "../src/agents/RealAgentClients";
import { v4 as uuidv4 } from "uuid";

export interface ServerConfig extends ContextServiceConfig {
  port: number;
  host: string;
  version: string;
}

export class ContextServer {
  private app: express.Application;
  private service: ContextService;
  private config: ServerConfig;
  private flowRegistry: FlowRegistry;
  private flowOrchestrator: FlowOrchestrator;

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();
    this.service = new ContextService(config);
    this.flowRegistry = new FlowRegistry();

    // Initialize orchestrator with real agents (Phase C)
    const realAgents = createRealAgents();
    this.flowOrchestrator = new FlowOrchestrator({
      registry: this.flowRegistry,
      agents: realAgents,
      maxConcurrency: 10,
      defaultTimeout: 30000,
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.loadFlowTemplates();
  }

  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json());

    // Trace context generation
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const traceId = req.headers["x-trace-id"] || uuidv4();
      const parentSpanId = req.headers["x-parent-span-id"];
      const spanId = uuidv4();

      (req as any).traceId = traceId;
      (req as any).spanId = spanId;
      (req as any).parentSpanId = parentSpanId;

      res.setHeader("X-Trace-ID", traceId);
      res.setHeader("X-Span-ID", spanId);
      res.setHeader("X-CIC-Context-API-Version", this.config.version);

      next();
    });

    // Tracing
    this.app.use(new TraceMiddleware().middleware());

    // Metrics
    this.app.use(new MetricsMiddleware().middleware());
  }

  private setupRoutes(): void {
    // GET /health
    this.app.get("/health", async (req: Request, res: Response) => {
      try {
        const health = await this.service.health();
        res.status(200).json(health);
      } catch (error) {
        res.status(503).json({
          status: "unhealthy",
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // GET /context/:id
    this.app.get("/context/:id", async (req: Request, res: Response) => {
      const { id } = req.params as Record<string, string>;
      const traceId = (req as any).traceId;

      try {
        const context = await this.service.getContext(id as string, traceId);
        res.status(200).json({ context });
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes("not found")) {
          res.status(404).json({
            error: "context_not_found",
            message: `No context with id ${id}`,
            trace_id: traceId,
          });
        } else if (message.includes("timeout")) {
          res.status(504).json({
            error: "timeout",
            message,
            trace_id: traceId,
          });
        } else {
          res.status(500).json({
            error: "internal_error",
            message,
            trace_id: traceId,
          });
        }
      }
    });

    // GET /context/:id/slices/:slice_id
    this.app.get(
      "/context/:id/slices/:slice_id",
      async (req: Request, res: Response) => {
        const { id, slice_id } = req.params as Record<string, string>;
        const traceId = (req as any).traceId;

        try {
          const slice = await this.service.getSlice(id as string, slice_id as string, traceId);
          res.status(200).json({ slice });
        } catch (error) {
          const message = (error as Error).message;
          if (message.includes("not found")) {
            res.status(404).json({
              error: "slice_not_loaded",
              message: `Slice ${slice_id} not found`,
              trace_id: traceId,
            });
          } else {
            res.status(500).json({
              error: "internal_error",
              message,
              trace_id: traceId,
            });
          }
        }
      }
    );

    // POST /context/query
    this.app.post("/context/query", async (req: Request, res: Response) => {
      const { query, context_id, limit } = req.body;
      const traceId = (req as any).traceId;

      if (!query || !context_id) {
        res.status(400).json({
          error: "query_malformed",
          message: "Missing required fields: query, context_id",
          trace_id: traceId,
        });
        return;
      }

      try {
        const results = await this.service.query({
          query,
          context_id,
          limit,
        });
        res.status(200).json({ results });
      } catch (error) {
        res.status(500).json({
          error: "internal_error",
          message: (error as Error).message,
          trace_id: traceId,
        });
      }
    });

    // GET /flows - List flow templates
    this.app.get("/flows", async (req: Request, res: Response) => {
      const traceId = (req as any).traceId;
      const status = req.query.status as string | undefined;

      try {
        const templates = this.flowRegistry.listTemplates(
          status as any
        );
        res.status(200).json({ flows: templates, count: templates.length });
      } catch (error) {
        res.status(500).json({
          error: "internal_error",
          message: (error as Error).message,
          trace_id: traceId,
        });
      }
    });

    // GET /flows/:template_id - Get flow template
    this.app.get("/flows/:template_id", async (req: Request, res: Response) => {
      const { template_id } = req.params as Record<string, string>;
      const traceId = (req as any).traceId;

      try {
        const template = this.flowRegistry.getTemplate(template_id as string);
        if (!template) {
          res.status(404).json({
            error: "template_not_found",
            message: `Flow template ${template_id} not found`,
            trace_id: traceId,
          });
          return;
        }
        res.status(200).json({ template });
      } catch (error) {
        res.status(500).json({
          error: "internal_error",
          message: (error as Error).message,
          trace_id: traceId,
        });
      }
    });

    // POST /flow/execute - Execute a flow
    this.app.post("/flow/execute", async (req: Request, res: Response) => {
      const { template_id, input } = req.body;
      const traceId = (req as any).traceId;

      if (!template_id || !input) {
        res.status(400).json({
          error: "request_malformed",
          message: "Missing required fields: template_id, input",
          trace_id: traceId,
        });
        return;
      }

      try {
        const executionId = await this.flowOrchestrator.executeFlow(
          template_id,
          input,
          traceId
        );
        res.status(202).json({
          execution_id: executionId,
          template_id,
          status: "queued",
          created_at: new Date().toISOString(),
          trace_id: traceId,
        });
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes("not found")) {
          res.status(404).json({
            error: "template_not_found",
            message,
            trace_id: traceId,
          });
        } else {
          res.status(500).json({
            error: "internal_error",
            message,
            trace_id: traceId,
          });
        }
      }
    });

    // GET /flow/execution/:execution_id - Get execution status
    this.app.get(
      "/flow/execution/:execution_id",
      async (req: Request, res: Response) => {
        const { execution_id } = req.params as Record<string, string>;
        const traceId = (req as any).traceId;

        try {
          const execution = this.flowRegistry.getExecution(execution_id as string);
          if (!execution) {
            res.status(404).json({
              error: "execution_not_found",
              message: `Execution ${execution_id} not found`,
              trace_id: traceId,
            });
            return;
          }
          res.status(200).json({ execution });
        } catch (error) {
          res.status(500).json({
            error: "internal_error",
            message: (error as Error).message,
            trace_id: traceId,
          });
        }
      }
    );
  }

  private setupErrorHandling(): void {
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        const traceId = (req as any).traceId;
        console.error("Unhandled error:", err, { trace_id: traceId });
        res.status(500).json({
          error: "internal_error",
          message: err.message,
          trace_id: traceId,
        });
      }
    );
  }

  private loadFlowTemplates(): void {
    const flowsPath = "projects/cic/data/flows.json";
    const loaded = FlowLoader.loadAndRegister(this.flowRegistry, flowsPath);
    if (loaded > 0) {
      console.log(`✓ Loaded ${loaded} flow templates`);
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        console.log(
          `Context Server listening on ${this.config.host}:${this.config.port}`
        );
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

export default ContextServer;
