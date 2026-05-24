# Claude Connectors

This document outlines the inferred structural definition of Connectors for the Claude platform.

---
-   **Source:** `INFERRED` (from user prompt for this export)
-   **Confidence:** `Low`
---

## 1. Connector Architecture (Inferred)

-   **Definition:** The user prompt that initiated this system export explicitly mentioned "Claude Web (..., Connectors)". This implies that "Connector" is a first-class architectural concept within the Claude Web ecosystem.
-   **Nature (Inferred):** A Connector is likely a specific type of plugin or configuration designed to connect the Claude agent to external data sources or APIs (e.g., a specific database, a SaaS platform, a version control system).
-   **Distinction (Inferred):** The fact that "Connectors" are listed separately from "Skills" and "Plugins" suggests they have a distinct purpose or implementation, likely focused on data integration rather than agent instruction (Skills) or general functionality (Plugins).

## 2. MCP as a Connector System (Inferred)

-   It is possible that the "MCP" (Monorepo Control Plane) server definitions are the underlying implementation of what the Claude Web UI exposes as "Connectors". An MCP "server" that connects to a specific service (e.g., Confluence, as seen in other project files) would fit the description of a Connector.

## 3. Unknowns

-   The exact user interface, configuration format, and capabilities of Claude Web Connectors are unknown.
-   How Connectors are created, shared, or managed is unknown.
-   The precise relationship between Connectors and the MCP is unknown.
