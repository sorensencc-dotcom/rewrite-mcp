# Copilot Capabilities

This document outlines the inferred capabilities of the Microsoft Copilot platform.

---
-   **Source:** `INFERRED`
-   **Confidence:** `Medium`
---

## 1. Core Capabilities

-   **Code Completion:** Its primary capability is to provide real-time, context-aware code completions in the editor.
-   **Conversational Chat:** Provides an in-editor chat interface for answering questions, explaining code, and generating code snippets.

## 2. Inferred Advanced Capabilities

-   **Contextual Awareness:** Can ingest context from a `.github/copilot-instructions.md` file to become aware of project-specific skills and tools.
-   **Skill Awareness:** Can be made aware of the existence and purpose of `SKILL.md` files, but it does not appear to *execute* them. Its capability is to reference or explain them in a chat conversation.
-   **MCP Server Interaction:** The Copilot Chat "Agent" appears capable of interacting with external tools and services via the "MCP" (Monorepo Control Plane) architecture, similar to Claude.

## 3. Unknowns

-   The full set of capabilities of the Copilot Chat "Agent" is unknown.
-   The range of interactions possible with MCP servers is unknown.
-   Whether Copilot has any direct file system manipulation capabilities beyond generating code that the user then saves is unknown.
