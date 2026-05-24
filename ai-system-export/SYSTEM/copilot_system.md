# Copilot System

This document outlines the inferred structural and architectural identity of the Microsoft Copilot system, based on observations from the user's workspace.

---
-   **Source:** `INFERRED` (from `.github/copilot-instructions.md`)
-   **Confidence:** `Medium`
---

## 1. Core Identity & Architecture

-   **Model Family:** OpenAI/Microsoft (e.g., GPT-4).
-   **Nature:** Primarily an in-editor code completion and chat assistant (GitHub Copilot / Copilot Chat).
-   **Architecture:** The core functionality is code suggestion based on the context of the open files. The chat functionality is augmented by a "toolbox" that can be made aware of project-specific context.

## 2. Key Architectural Patterns (Inferred)

-   **Contextual Awareness via Instructions:** Copilot's behavior is customized via a `.github/copilot-instructions.md` file. This file is not a direct prompt but serves as a source of contextual information that Copilot can draw upon.
-   **Toolbox for Discovery:** A tool named "GitHub Copilot Toolbox" appears to be used to automatically scan the workspace and user directories to discover "MCP servers" and "skills".
-   **Skill Awareness (Not Execution):** The toolbox does not seem to enable Copilot to *execute* skills in the same way as Gemini or Claude. Instead, it makes Copilot *aware* of them, allowing it to "attach or cite paths in chat". This suggests Copilot might recommend a skill to the user or explain what it does, rather than running it.
-   **MCP Integration:** Copilot is aware of the same "MCP" (Monorepo Control Plane) concept as Claude, suggesting a shared tool/server architecture between them that Copilot can also leverage, likely through its Chat Agent functionality.

## 3. Unknowns

-   The exact mechanism by which Copilot Chat's "Agent" mode interacts with MCP servers is unknown.
-   The full capabilities of the "GitHub Copilot Toolbox" are unknown.
-   The format of Copilot's long-term memory and preferences is not exposed in the workspace files.
