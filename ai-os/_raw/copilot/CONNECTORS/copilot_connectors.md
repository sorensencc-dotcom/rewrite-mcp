# Copilot Connectors

This document outlines the inferred structural definition of Connectors for the Microsoft Copilot platform.

---
-   **Source:** `INFERRED` (from `.github/copilot-instructions.md`)
-   **Confidence:** `Medium`
---

## 1. Connector Architecture (Inferred)

-   **Definition:** Copilot does not appear to have a concept named "Connector". The equivalent functionality seems to be provided by the **MCP (Monorepo Control Plane)** integration.
-   **Nature:** The MCP allows Copilot's Chat Agent to connect to and interact with external "servers" or tools. These servers act as the "connectors" to other systems.

## 2. Inferred Connectors (via MCP)

-   The `.github/copilot-instructions.md` file explicitly lists an active "User MCP" server:
    -   **`microsoft/markitdown`**: This appears to be a connector to a service that processes Markdown (`markitdown-mcp`).
-   The file also references a `Confluence / Atlassian` MCP in its comments, implying that a connector to Atlassian products is also part of this ecosystem.

## 3. Unknowns

-   The full list of available MCP servers/connectors is unknown.
-   The specific protocol or API for interacting with these MCP servers is unknown.
-   How new connectors are created or configured is unknown, although it likely involves an `mcp.json` file.
