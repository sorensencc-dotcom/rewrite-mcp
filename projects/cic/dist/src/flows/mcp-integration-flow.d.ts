/**
 * MCP Integration Flow — Demonstrates end-to-end MCP usage in Ruflo
 *
 * Flow stages:
 * 1. Validate environment (diagnostics)
 * 2. Detect drift between spec and implementation
 * 3. Auto-sync documentation (conditional on no drift)
 * 4. Run orchestrator task (always, for completeness)
 *
 * This flow is used for integration testing and as a reference for building
 * MCP-aware flows.
 */
import { FlowTemplate } from "../ruflo-orchestration/FlowRegistry.js";
export declare const mcpIntegrationFlow: FlowTemplate;
