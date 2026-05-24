# Claude Memory

This document outlines the inferred structural memory systems for the Claude platform, based on observations from the user's workspace.

---
-   **Source:** `INFERRED` (from project file names and contents)
-   **Confidence:** `Low`
---

## 1. Inferred Memory Mechanisms

Based on file names and the `claude-skills` repository, the Claude platform appears to use several mechanisms for persistent memory and context.

### 1.1. `CLAUDE.md` Files

-   **Location (Inferred):** Likely placed within project directories. The `rewrite-mcp` project contains a `CLAUDE.md` file.
-   **Nature (Inferred):** These files seem analogous to Gemini's `GEMINI.md`. They likely contain project-specific instructions, architectural notes, and prompt patterns intended to guide the Claude agent's behavior within that project.

### 1.2. Web-Based "Projects"

-   **Location (Unknown):** Resides within the Claude Web UI.
-   **Nature (Inferred):** The user prompt for this export mentions "Claude Web (Projects, ...)", implying a first-class "Project" entity within the Claude ecosystem. These projects likely serve as containers for context, files, and skills, providing long-term memory for specific tasks or workspaces. The exact structure and capabilities of these projects are unknown.

## 2. Unknowns

-   The primary mechanism for long-term, cross-session user preferences or "memory" is unknown.
-   How context from `CLAUDE.md` files, Web Projects, and session history is layered and prioritized is unknown.
-   It is unknown if there is an equivalent to Gemini's private, user-specific `MEMORY.md` file.
