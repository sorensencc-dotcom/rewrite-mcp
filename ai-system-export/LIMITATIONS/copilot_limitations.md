# Copilot Limitations

This document outlines the inferred operational limitations of the Microsoft Copilot platform.

---
-   **Source:** `INFERRED`
-   **Confidence:** `Medium`
---

## 1. Core Limitations

-   **Passive Nature:** Copilot's primary function is code completion, which is a passive activity. It suggests code but does not execute it or perform actions on its own.
-   **Limited Agency:** Even in its "Chat Agent" mode, Copilot's agency appears limited. It seems designed to answer questions, generate code, and interact with pre-defined MCP servers, but not to carry out complex, multi-step workflows involving file system manipulation or command execution in the same way as Gemini.

## 2. Skill Interaction

-   **No Skill Execution:** The `copilot-instructions.md` file suggests that Copilot is made *aware* of skills but does not *execute* their workflows. Its limitation is that it can only talk *about* the skills, not act *through* them.

## 3. Environment Interaction

-   **Indirect Side Effects:** Copilot cannot directly modify files or run commands. Its only way to affect the system is to generate code or commands that the user then chooses to save or execute. All side effects are user-mediated.
-   **Reliance on MCP:** Its ability to interact with external services is entirely dependent on the availability and configuration of MCP servers. It cannot connect to arbitrary services or APIs without a corresponding MCP connector.
