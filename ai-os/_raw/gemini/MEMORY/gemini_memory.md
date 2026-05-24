# Gemini Memory

This document outlines the stable, structural memory systems used by the Gemini agent in this workspace.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Core Memory Mechanisms

The Gemini agent's memory is architecturally divided into two main categories: Session-based (volatile) and File-based (persistent). This document describes the persistent, structural memory.

### 1.1. Project-Specific Instructions (`GEMINI.md`)

-   **Location:** Resides in the root of a project directory (e.g., `/mnt/c/dev/GEMINI.md`).
-   **Scope:** Shared, project-wide instructions, conventions, and workflows.
-   **Nature:** This file is intended to be committed to the project's repository and shared among all collaborators using the Gemini agent.
-   **Content:** Contains stable, long-term information like how to run builds, release procedures, architectural patterns, and standard operational workflows.
-   **Access:** The content of all loaded `GEMINI.md` files is automatically included in the agent's context for every turn within that project.

### 1.2. Private Project Memory (`MEMORY.md`)

-   **Location:** Resides in a private, user-specific directory outside the project workspace (e.g., `/home/soren/.gemini/tmp/dev/memory/MEMORY.md`).
-   **Scope:** Private, user-specific, project-specific notes and context.
-   **Nature:** This file is **not** intended to be committed to a repository. It stores the user's personal preferences, notes, and state for a specific project.
-   **Content:** Acts as a private index for the workspace. It can contain summaries of project state, key file paths, and pointers to other, more detailed notes stored as sibling markdown files. The user can instruct the agent to "remember" things, which are then saved to this file.
-   **Access:** The content of the private `MEMORY.md` index is automatically included in the agent's context for every turn.

## 2. Memory Management Principles

-   **Explicit over Implicit:** The agent's memory is based on explicit, file-based content rather than an implicit, internal long-term memory database.
-   **User-Controlled:** The user has direct control over the persistent memory by editing the `GEMINI.md` and private `MEMORY.md` files.
-   **Layered Context:** The memory system is layered. The agent synthesizes context from project instructions (`GEMINI.md`), private memory (`MEMORY.md`), and the immediate conversation history to inform its actions.
