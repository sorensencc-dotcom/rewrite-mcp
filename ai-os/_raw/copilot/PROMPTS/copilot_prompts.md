# Copilot Prompts

This document outlines the inferred structure of prompts for the Microsoft Copilot platform.

---
-   **Source:** `INFERRED` (from `.github/copilot-instructions.md`)
-   **Confidence:** `Medium`
---

## 1. Core Prompt Structure (Inferred)

Copilot's prompting appears to be a continuous, automatic process rather than a single system prompt for a conversational agent.

1.  **Code Context:** The primary component of the prompt is the content of the currently active file(s) in the editor, including the user's cursor position.
2.  **Instructional Context (`copilot-instructions.md`):** The content of this file is added to the prompt to provide broader project context, such as the existence of skills or MCP servers. This helps the model generate more relevant suggestions and chat responses.

## 2. Chat Prompt Structure (Inferred)

For Copilot Chat, the prompt is likely composed of:

1.  The user's chat message.
2.  The conversation history.
3.  The core code context from the active editor.
4.  The instructional context from `copilot-instructions.md`.

## 3. Unknowns

-   The exact "system prompt" or meta-instructions that define Copilot's core behavior (e.g., "You are a helpful AI pair programmer...") is unknown.
-   The precise formatting and token budgeting for how the different context sources are combined into a final prompt for the model is unknown.
