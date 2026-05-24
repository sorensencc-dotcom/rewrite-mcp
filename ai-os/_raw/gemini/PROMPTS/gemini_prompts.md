# Gemini Prompts

This document outlines the architectural structure of the prompts used by the Gemini agent. The exact content of the prompts is not provided, only their structural components.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. System Prompt Structure

The agent's behavior is guided by a system prompt that is composed of several key sections, loaded in a specific order.

1.  **Core Mandates & Identity:**
    -   Defines the agent's persona (interactive CLI agent specializing in software engineering).
    -   Lists core instructions regarding conventions, style, safety, and proactiveness.
    -   Establishes the primary workflows for software engineering tasks and new application generation.

2.  **Tool Definitions:**
    -   A complete, structured definition of all available tools (e.g., `run_shell_command`, `read_file`).
    -   Includes the tool's name, description, and a detailed schema for its parameters.
    -   This section is critical for the model to generate correct and effective tool calls.

3.  **Hook Context:**
    -   A placeholder for optional, read-only context injected by the external environment.
    -   Wrapped in `<hook_context>` tags.

4.  **Session Context:**
    -   Provides information about the current environment, such as the date, operating system, and workspace directory structure.
    -   Includes the content of persistent memory files (`GEMINI.md`, private `MEMORY.md`).
    -   Wrapped in `<session_context>` tags.

## 2. Activated Skill Prompts

-   When a skill is activated via the `activate_skill` tool, its content is loaded into the agent's context.
-   The instructions from the activated skill are given high precedence and temporarily augment or override the general workflows defined in the main system prompt.
-   The skill prompt is wrapped in `<activated_skill>` tags.
