/**
 * CIC Context Service — Main Entrypoint
 * Starts the context service with all subsystems wired
 */
import { ContextServer } from "./ContextServer.js";
import { FlowRegistry } from "../src/ruflo-orchestration/FlowRegistry.js";
import { FlowOrchestrator } from "../src/ruflo-orchestration/FlowOrchestrator.js";
import { loadConfig, validateConfig } from "../config/ContextConfig.js";
/**
 * Start the context service
 */
async function startService() {
    try {
        // Load and validate configuration
        const config = loadConfig();
        const errors = validateConfig(config);
        if (errors.length > 0) {
            console.error("Configuration validation failed:");
            errors.forEach((err) => console.error(`  - ${err}`));
            process.exit(1);
        }
        // Create flow registry with default flows
        const registry = new FlowRegistry();
        // Create flow orchestrator
        const orchestrator = new FlowOrchestrator({
            registry,
            agents: {
            // Agent clients are injected at runtime via the MAS agent registry.
            // See: projects/cic/docs/MAS_AGENT_WIRING.md for connection details.
            },
            maxConcurrency: config.ruflo.maxConcurrency,
            defaultTimeout: config.ruflo.defaultTimeout,
        });
        // Create context server
        const server = new ContextServer({
            port: config.port,
            host: config.host,
            version: config.apiVersion,
            crgBackendUrl: config.crg.baseUrl,
            cicBackendUrl: config.cic.baseUrl,
            cacheTTL: config.cache.ttl * 1000,
            requestTimeout: config.timeouts.request,
            maxSliceSize: 50000, // 50KB max slice content
        });
        // Start server
        await server.start();
        console.log(`CIC Context Service v${config.apiVersion} started`);
        console.log(`  Listening on ${config.host}:${config.port}`);
        console.log(`  CRG backend: ${config.crg.baseUrl}`);
        console.log(`  CIC backend: ${config.cic.baseUrl}`);
        console.log(`  Ruflo flows: ${registry.listTemplates().length} registered`);
        // Graceful shutdown
        process.on("SIGTERM", () => {
            console.log("SIGTERM received, shutting down gracefully...");
            process.exit(0);
        });
        process.on("SIGINT", () => {
            console.log("SIGINT received, shutting down gracefully...");
            process.exit(0);
        });
    }
    catch (error) {
        console.error("Failed to start context service:", error);
        process.exit(1);
    }
}
startService();
//# sourceMappingURL=index.js.map