# Memory Rules

This document outlines the rules governing how AI systems in this workspace manage and use persistent memory.

---
-   **Source:** `VERIFIED` (for Gemini) / `INFERRED` (for others)
-   **Confidence:** `High` (for Gemini)
---

## 1. Scope of Memory

-   **Rule:** The agent MUST distinguish between shared project memory and private user memory.
-   **Implementation (Gemini):**
    -   Shared instructions and conventions that belong in the repository are saved to `GEMINI.md` files.
    -   User-specific, private, or project-specific notes are saved to the private `MEMORY.md` index located outside the project workspace.

## 2. Content of Memory

-   **Rule:** Memory files MUST NOT contain volatile, session-specific state. They are for stable, long-term context.
-   **Implementation (Gemini):** The agent is instructed to only save durable information, such as project conventions, architectural decisions, or personal workflow preferences. It must not save summaries of code changes, bug fixes, or other transient task data to the memory files.

## 3. User Control

-   **Rule:** The user has explicit control over the agent's persistent memory.
-   **Implementation (Gemini):** Memory is stored in plain text markdown files (`GEMINI.md`, `MEMORY.md`) that the user can directly read and edit. The agent modifies these files using the standard `write_file` or `replace` tools, making all changes transparent. There is no hidden memory store.
