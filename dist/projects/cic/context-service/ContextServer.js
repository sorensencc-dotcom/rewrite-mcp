"use strict";
/**
 * CIC Context Service HTTP Server
 * Express server implementing the Context API contract
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextServer = void 0;
const express_1 = __importDefault(require("express"));
const ContextService_1 = require("./ContextService");
const TraceMiddleware_1 = require("../observability/TraceMiddleware");
const MetricsMiddleware_1 = require("../observability/MetricsMiddleware");
const FlowRegistry_1 = require("../src/ruflo-orchestration/FlowRegistry");
const FileExecutionStore_1 = require("../src/ruflo-orchestration/FileExecutionStore");
const FlowOrchestrator_1 = require("../src/ruflo-orchestration/FlowOrchestrator");
const FlowLoader_1 = require("../src/ruflo-orchestration/FlowLoader");
const RealAgentClients_1 = require("../src/agents/RealAgentClients");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ContextServer {
    constructor(config) {
        this.config = config;
        this.app = (0, express_1.default)();
        this.service = new ContextService_1.ContextService(config);
        // Phase E.0a: Wire FileExecutionStore for persistent execution state
        const executionStorePath = process.env.EXECUTION_STORE_PATH ||
            path.join(os.homedir(), '.cic', 'execution-state');
        const executionStore = new FileExecutionStore_1.FileExecutionStore({
            basePath: executionStorePath,
            retentionDays: 30,
        });
        // Initialize FlowRegistry with persistent execution store
        this.flowRegistry = new FlowRegistry_1.FlowRegistry(executionStore);
        // Initialize orchestrator with real agents (Phase C)
        const realAgents = (0, RealAgentClients_1.createRealAgents)();
        this.flowOrchestrator = new FlowOrchestrator_1.FlowOrchestrator({
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
    setupMiddleware() {
        // JSON parsing
        this.app.use(express_1.default.json());
        // Trace context generation
        this.app.use((req, res, next) => {
            const traceId = req.headers["x-trace-id"] || (0, uuid_1.v4)();
            const parentSpanId = req.headers["x-parent-span-id"];
            const spanId = (0, uuid_1.v4)();
            req.traceId = traceId;
            req.spanId = spanId;
            req.parentSpanId = parentSpanId;
            res.setHeader("X-Trace-ID", traceId);
            res.setHeader("X-Span-ID", spanId);
            res.setHeader("X-CIC-Context-API-Version", this.config.version);
            next();
        });
        // Tracing
        this.app.use(new TraceMiddleware_1.TraceMiddleware().middleware());
        // Metrics
        this.app.use(new MetricsMiddleware_1.MetricsMiddleware().middleware());
    }
    setupRoutes() {
        // GET /health
        this.app.get("/health", async (req, res) => {
            try {
                const health = await this.service.health();
                res.status(200).json(health);
            }
            catch (error) {
                res.status(503).json({
                    status: "unhealthy",
                    error: error.message,
                    timestamp: new Date().toISOString(),
                });
            }
        });
        // GET /context/:id
        this.app.get("/context/:id", async (req, res) => {
            const { id } = req.params;
            const traceId = req.traceId;
            try {
                const context = await this.service.getContext(id, traceId);
                res.status(200).json({ context });
            }
            catch (error) {
                const message = error.message;
                if (message.includes("not found")) {
                    res.status(404).json({
                        error: "context_not_found",
                        message: `No context with id ${id}`,
                        trace_id: traceId,
                    });
                }
                else if (message.includes("timeout")) {
                    res.status(504).json({
                        error: "timeout",
                        message,
                        trace_id: traceId,
                    });
                }
                else {
                    res.status(500).json({
                        error: "internal_error",
                        message,
                        trace_id: traceId,
                    });
                }
            }
        });
        // GET /context/:id/slices/:slice_id
        this.app.get("/context/:id/slices/:slice_id", async (req, res) => {
            const { id, slice_id } = req.params;
            const traceId = req.traceId;
            try {
                const slice = await this.service.getSlice(id, slice_id, traceId);
                res.status(200).json({ slice });
            }
            catch (error) {
                const message = error.message;
                if (message.includes("not found")) {
                    res.status(404).json({
                        error: "slice_not_loaded",
                        message: `Slice ${slice_id} not found`,
                        trace_id: traceId,
                    });
                }
                else {
                    res.status(500).json({
                        error: "internal_error",
                        message,
                        trace_id: traceId,
                    });
                }
            }
        });
        // POST /context/query
        this.app.post("/context/query", async (req, res) => {
            const { query, context_id, limit } = req.body;
            const traceId = req.traceId;
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
            }
            catch (error) {
                res.status(500).json({
                    error: "internal_error",
                    message: error.message,
                    trace_id: traceId,
                });
            }
        });
        // GET /flows - List flow templates
        this.app.get("/flows", async (req, res) => {
            const traceId = req.traceId;
            const status = req.query.status;
            try {
                const templates = this.flowRegistry.listTemplates(status);
                res.status(200).json({ flows: templates, count: templates.length });
            }
            catch (error) {
                res.status(500).json({
                    error: "internal_error",
                    message: error.message,
                    trace_id: traceId,
                });
            }
        });
        // GET /flows/:template_id - Get flow template
        this.app.get("/flows/:template_id", async (req, res) => {
            const { template_id } = req.params;
            const traceId = req.traceId;
            try {
                const template = this.flowRegistry.getTemplate(template_id);
                if (!template) {
                    res.status(404).json({
                        error: "template_not_found",
                        message: `Flow template ${template_id} not found`,
                        trace_id: traceId,
                    });
                    return;
                }
                res.status(200).json({ template });
            }
            catch (error) {
                res.status(500).json({
                    error: "internal_error",
                    message: error.message,
                    trace_id: traceId,
                });
            }
        });
        // POST /flow/execute - Execute a flow
        this.app.post("/flow/execute", async (req, res) => {
            const { template_id, input } = req.body;
            const traceId = req.traceId;
            if (!template_id || !input) {
                res.status(400).json({
                    error: "request_malformed",
                    message: "Missing required fields: template_id, input",
                    trace_id: traceId,
                });
                return;
            }
            try {
                const executionId = await this.flowOrchestrator.executeFlow(template_id, input, traceId);
                res.status(202).json({
                    execution_id: executionId,
                    template_id,
                    status: "queued",
                    created_at: new Date().toISOString(),
                    trace_id: traceId,
                });
            }
            catch (error) {
                const message = error.message;
                if (message.includes("not found")) {
                    res.status(404).json({
                        error: "template_not_found",
                        message,
                        trace_id: traceId,
                    });
                }
                else {
                    res.status(500).json({
                        error: "internal_error",
                        message,
                        trace_id: traceId,
                    });
                }
            }
        });
        // GET /flow/execution/:execution_id - Get execution status
        this.app.get("/flow/execution/:execution_id", async (req, res) => {
            const { execution_id } = req.params;
            const traceId = req.traceId;
            try {
                const execution = this.flowRegistry.getExecution(execution_id);
                if (!execution) {
                    res.status(404).json({
                        error: "execution_not_found",
                        message: `Execution ${execution_id} not found`,
                        trace_id: traceId,
                    });
                    return;
                }
                res.status(200).json({ execution });
            }
            catch (error) {
                res.status(500).json({
                    error: "internal_error",
                    message: error.message,
                    trace_id: traceId,
                });
            }
        });
    }
    setupErrorHandling() {
        this.app.use((err, req, res, next) => {
            const traceId = req.traceId;
            console.error("Unhandled error:", err, { trace_id: traceId });
            res.status(500).json({
                error: "internal_error",
                message: err.message,
                trace_id: traceId,
            });
        });
    }
    loadFlowTemplates() {
        const flowsPath = "projects/cic/data/flows.json";
        const loaded = FlowLoader_1.FlowLoader.loadAndRegister(this.flowRegistry, flowsPath);
        if (loaded > 0) {
            console.log(`✓ Loaded ${loaded} flow templates`);
        }
    }
    start() {
        return new Promise((resolve) => {
            this.app.listen(this.config.port, this.config.host, () => {
                console.log(`Context Server listening on ${this.config.host}:${this.config.port}`);
                resolve();
            });
        });
    }
    getApp() {
        return this.app;
    }
}
exports.ContextServer = ContextServer;
exports.default = ContextServer;
//# sourceMappingURL=ContextServer.js.map