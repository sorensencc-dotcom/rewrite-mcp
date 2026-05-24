# Copilot Workflows

This document outlines the inferred structural workflows for the Microsoft Copilot platform.

---
-   **Source:** `INFERRED`
-   **Confidence:** `Low`
---

## 1. Core Workflow: Code Completion

-   **Nature:** This is a passive, continuous workflow.
-   **Steps:**
    1.  Copilot constantly monitors the user's typing and the content of the open editor.
    2.  It sends this context to a model to predict and generate relevant code completions.
    3.  The suggestions are presented to the user inline for acceptance or dismissal.

## 2. Inferred Workflow: Chat Agent Interaction

-   **Nature:** An interactive, conversational workflow within the IDE.
-   **Steps (Inferred):**
    1.  User initiates a chat with a specific request.
    2.  Copilot processes the request, using the open editor content and information from `.github/copilot-instructions.md` as context.
    3.  If the request matches a known "MCP server" (e.g., "open this Confluence page"), the Chat "Agent" may interact with that server to fulfill the request.
    4.  If the request matches a known "skill", the agent may cite the skill's file path or summarize its contents, but it does not appear to *execute* the skill's workflow.
    5.  The agent provides a response in the chat panel, which could be an explanation, a code snippet, or the result of an MCP interaction.

## 3. Unknowns

-   The precise workflow and protocol for how the Copilot Chat Agent interacts with MCP servers is unknown.
-   The workflows for the "GitHub Copilot Toolbox" tool, which generates the `copilot-instructions.md` file, are unknown.
