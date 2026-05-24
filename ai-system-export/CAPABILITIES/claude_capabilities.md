# Claude Capabilities

This document outlines the inferred capabilities of the Claude platform.

---
-   **Source:** `INFERRED`
-   **Confidence:** `Low`
---

## 1. Core Capabilities (Inferred)

-   **Skill Execution:** Can load and execute complex, multi-step workflows defined in `SKILL.md` files. This is its primary mode of operation for structured tasks.
-   **Persona Activation:** Can adopt different "agent personas" (e.g., `cs-engineering-lead`) which are likely defined as specialized skills that alter its system prompt and behavior.
-   **Local File System Interaction:** The `deploy-skill.js` script implies that the Claude agent can read from the local file system to load skills. Its broader file system capabilities (reading/writing arbitrary files) are unknown but likely exist.

## 2. Tool/Connector Capabilities (Inferred)

-   **MCP Server Interaction:** Can connect to and interact with external tools and services via the "MCP" (Monorepo Control Plane) architecture. This is likely how it integrates with services like Confluence or the inferred `markitdown` service.
-   **Web Connectors:** The Claude Web UI is believed to have a "Connectors" feature for integrating with external data sources, which may be a user-friendly interface on top of the MCP architecture.

## 3. Unknowns

-   A discrete list of available tools, equivalent to Gemini's toolset (`read_file`, `run_shell_command`, etc.), is unknown. It is possible these are all abstracted away as MCP "servers".
-   The specific capabilities of the Claude Web UI (e.g., for project and skill management) are unknown.
-   It is unknown if Claude has built-in web search capabilities or if that would require a specific Connector/MCP server.
