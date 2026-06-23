/**
 * Ruflo MCP Agents — Flow-callable wrappers for MCP servers
 * Registers MCP operations as first-class Ruflo agents with full observability
 *
 * These agents bridge the MCP client layer with Ruflo flow orchestration,
 * allowing flows to call MCP operations as stages with automatic tracing.
 *
 * Agents:
 * - mcp-summarizer: Extract and checksum file sections
 * - mcp-drift: Detect divergence between spec and implementation
 * - mcp-diagnostics: Validate environment (Node, Docker, etc.)
 * - mcp-docs-sync: Auto-update documentation after changes
 * - mcp-orchestrator: Cross-system task routing (CIC ↔ Rewrite Labs)
 */
import { getCICMCPIntegration, } from "../lib/mcp-integration.js";
/**
 * Creates an AgentClient that wraps an MCP method
 */
function createMCPAgent(agentId, handler) {
    return {
        async invoke(method, input, traceId) {
            const context = {
                traceId,
                correlationId: `${agentId}-${Date.now()}`,
            };
            try {
                return await handler(input, context);
            }
            catch (err) {
                const error = err;
                const appError = new Error(`MCP agent ${agentId} failed: ${error.message}`);
                appError.cause = err;
                throw appError;
            }
        },
    };
}
/**
 * MCP Summarizer Agent
 * Extracts and checksums file sections for audit trails
 */
export const mcpSummarizerAgent = createMCPAgent("mcp-summarizer", async (input, context) => {
    const mcp = getCICMCPIntegration();
    const params = input;
    const result = await mcp.summarize(params, context);
    return {
        filePath: result.filePath,
        startLine: result.startLine,
        endLine: result.endLine,
        lineCount: result.lineCount,
        checksum: result.checksum,
        contentLength: result.content.length,
    };
});
/**
 * MCP Drift Detector Agent
 * Compares spec vs implementation, computes drift score
 */
export const mcpDriftAgent = createMCPAgent("mcp-drift", async (input, context) => {
    const mcp = getCICMCPIntegration();
    const params = input;
    const result = await mcp.detectDrift(params, context);
    return {
        driftScore: result.driftScore,
        threshold: result.threshold,
        exceedsThreshold: result.exceedsThreshold,
        findingsCount: result.findings.length,
        findings: result.findings,
    };
});
/**
 * MCP Diagnostics Agent
 * Validates environment (Node, Docker, TypeScript, Qdrant, env vars)
 */
export const mcpDiagnosticsAgent = createMCPAgent("mcp-diagnostics", async (input, context) => {
    const mcp = getCICMCPIntegration();
    const params = input;
    const result = await mcp.diagnose(params, context);
    return {
        allPassed: result.allPassed,
        timestamp: result.timestamp,
        resultsCount: result.results.length,
        results: result.results,
    };
});
/**
 * MCP Docs Sync Agent
 * Auto-updates CHANGELOG and roadmap after code changes
 */
export const mcpDocsSyncAgent = createMCPAgent("mcp-docs-sync", async (input, context) => {
    const mcp = getCICMCPIntegration();
    const params = input;
    const result = await mcp.syncDocs(params, context);
    return {
        changeType: result.changeType,
        description: result.description,
        docsUpdated: result.docsUpdated,
        roadmapUpdated: result.roadmapUpdated,
        commitHash: result.commitHash || "not-committed",
        timestamp: result.timestamp,
    };
});
/**
 * MCP Orchestrator Agent
 * Routes cross-system tasks (CIC ↔ Rewrite Labs)
 */
export const mcpOrchestratorAgent = createMCPAgent("mcp-orchestrator", async (input, context) => {
    const mcp = getCICMCPIntegration();
    const params = input;
    const result = await mcp.runTask(params, context);
    return {
        taskId: result.taskId,
        owner: result.owner,
        taskType: result.taskType,
        status: result.status,
        executionMs: result.executionMs,
        checksum: result.checksum || "not-checksummed",
        timestamp: result.timestamp,
    };
});
/**
 * Agent registry for Ruflo orchestration
 * Export this to register with FlowOrchestrator
 */
export const mcpAgents = {
    "mcp-summarizer": mcpSummarizerAgent,
    "mcp-drift": mcpDriftAgent,
    "mcp-diagnostics": mcpDiagnosticsAgent,
    "mcp-docs-sync": mcpDocsSyncAgent,
    "mcp-orchestrator": mcpOrchestratorAgent,
};
/**
 * Get all MCP agents for registration with orchestrator
 */
export function getMCPAgents() {
    return mcpAgents;
}
//# sourceMappingURL=agents.js.map