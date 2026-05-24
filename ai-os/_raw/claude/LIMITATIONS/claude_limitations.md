# Claude Limitations

This document outlines the inferred operational limitations of the Claude platform.

---
-   **Source:** `INFERRED`
-   **Confidence:** `Low`
---

## 1. Filesystem and Environment (Inferred)

-   **Local Dependency:** The "Cowork" or "Desktop" agent appears to rely on skills being present in a specific, local user directory. This may limit the portability of a project setup across different machines without explicitly deploying the necessary skills on each one.
-   **Sandbox (Unknown):** The extent of the Claude agent's filesystem sandbox is unknown.

## 2. State and Memory (Inferred)

-   **Context Window:** As an LLM, Claude is subject to a finite context window, similar to Gemini.
-   **Memory Persistence (Unknown):** The mechanisms for persistent memory are not fully understood. It is unclear how context from Web Projects, `CLAUDE.md` files, and session history is managed and prioritized, or what happens when the context limit is reached.

## 3. Tool Interaction (Inferred)

-   **Tool Abstraction:** Capabilities seem to be abstracted behind "Skills" and "MCP Servers". This may limit the agent's ability to perform low-level, ad-hoc interactions with the system if a specific skill or server for the task does not exist. It may have less flexibility than an agent with direct `run_shell_command` access.
