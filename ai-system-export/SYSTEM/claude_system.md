# Claude System

This document outlines the inferred structural and architectural identity of the Claude systems, based on observations from the user's workspace and general knowledge.

---
-   **Source:** `INFERRED` (from project files like `claude-skills` repo and `deploy-skill.js`)
-   **Confidence:** `Medium`
---

## 1. Core Identity & Architecture

-   **Model Family:** Claude (presumably, given the context).
-   **Nature:** Appears to operate in multiple modalities:
    -   **Claude Desktop / Cowork:** A local agent environment, possibly with a GUI, that can run skills from a specific plugin directory (`local-agent-mode-sessions`).
    -   **Claude Web:** A web-based interface with project and skill management capabilities.
    -   **Claude Code:** An integration within a code editor (e.g., VS Code) that uses an "MCP" (Monorepo Control Plane?) for tool/server interaction.
-   **Architecture:** Likely a tool-augmented LLM, similar to Gemini, but with a different set of integrations and plugin architectures.

## 2. Key Architectural Patterns (Inferred)

-   **Local Skill Deployment:** The `deploy-skill.js` script reveals a local deployment model where skills are placed in a specific directory structure (`<skill-name>/SKILL.md`) within a user's AppData to be loaded by a local agent.
-   **Structured Skills:** The `claude-skills` repository and the deployment script indicate a reliance on structured `SKILL.md` files with YAML frontmatter, similar to the format used by Gemini in this workspace.
-   **MCP (Monorepo Control Plane):** The `.github/copilot-instructions.md` file mentions an "MCP" that manages "live tools" and "servers". This suggests a system for integrating external tools and services into the Claude agent's workflow. `mcp.json` files appear to define these server configurations.
-   **Connectors:** The prompt mentions "Connectors", suggesting a specific abstraction for data source integration in the Claude Web environment.

## 3. Unknowns

-   The exact mechanism for how Claude Web projects, skills, and connectors are defined and managed is unknown.
-   The internal architecture of the "MCP" is unknown.
-   The specific tools available to the Claude agents are not fully known, but are likely related to the "servers" defined in `mcp.json`.
