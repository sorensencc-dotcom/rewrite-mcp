# Claude Plugins

This document outlines the inferred structural definition of Plugins for the Claude platform.

---
-   **Source:** `INFERRED` (from `deploy-skill.js` and file paths)
-   **Confidence:** `Medium`
---

## 1. Plugin Architecture (Inferred)

-   **Definition:** For Claude, a "Plugin" appears to be a directory containing a `SKILL.md` file, deployed to a specific local path.
-   **Scope:** These plugins are loaded by the "Claude Desktop" or "Cowork" local agent. The `deploy-skill.js` script explicitly targets a `skills-plugin` directory, suggesting that skills *are* the plugins in this context.
-   **Nature:** This is a file-based, local plugin system. It allows users to extend the capabilities of their local Claude agent by adding new skills.

## 2. MCP as a Plugin System (Inferred)

-   **Definition:** The "MCP" (Monorepo Control Plane) mentioned in the `copilot-instructions.md` file appears to be another form of plugin or connector system, shared between Claude and Copilot.
-   **Nature:** It seems to be a system for defining and interacting with external "servers" or tools. The `mcp.json` files likely contain the configuration for these plugins. This system appears more analogous to Gemini's `Tools` than the file-based skill plugins.

## 3. Unknowns

-   The exact format of the `mcp.json` files is unknown.
-   The full range of services or tools that can be integrated via the MCP is unknown.
-   The relationship between the local "skills-plugin" system and the MCP "server" system is unclear. They may be two separate, parallel plugin architectures.
