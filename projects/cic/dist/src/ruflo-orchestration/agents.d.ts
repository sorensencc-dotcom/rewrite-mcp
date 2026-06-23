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
import { AgentClient } from "./FlowOrchestrator.js";
/**
 * MCP Summarizer Agent
 * Extracts and checksums file sections for audit trails
 */
export declare const mcpSummarizerAgent: AgentClient;
/**
 * MCP Drift Detector Agent
 * Compares spec vs implementation, computes drift score
 */
export declare const mcpDriftAgent: AgentClient;
/**
 * MCP Diagnostics Agent
 * Validates environment (Node, Docker, TypeScript, Qdrant, env vars)
 */
export declare const mcpDiagnosticsAgent: AgentClient;
/**
 * MCP Docs Sync Agent
 * Auto-updates CHANGELOG and roadmap after code changes
 */
export declare const mcpDocsSyncAgent: AgentClient;
/**
 * MCP Orchestrator Agent
 * Routes cross-system tasks (CIC ↔ Rewrite Labs)
 */
export declare const mcpOrchestratorAgent: AgentClient;
/**
 * Agent registry for Ruflo orchestration
 * Export this to register with FlowOrchestrator
 */
export declare const mcpAgents: Record<string, AgentClient>;
/**
 * Get all MCP agents for registration with orchestrator
 */
export declare function getMCPAgents(): Record<string, AgentClient>;
