# Claude Prompts

This document outlines the inferred structure of prompts for the Claude platform.

---
-   **Source:** `INFERRED` (from project files and skill contents)
-   **Confidence:** `Medium`
---

## 1. System Prompt Structure (Inferred)

-   **`CLAUDE.md` Files:** The existence of `CLAUDE.md` files in project directories strongly suggests they serve as a form of system prompt or a major component of one. They likely contain project-specific instructions, conventions, and architectural details.
-   **Personas as Prompts:** The concept of "agent personas" implies that Claude can be initialized with different system prompts that define its expertise and personality (e.g., "You are a senior architect..."). These personas are likely stored as `SKILL.md` files and loaded as system prompts.

## 2. Skill Prompts (Inferred)

-   **`SKILL.md` as a Task-Specific Prompt:** As with Gemini, activating a skill likely injects the content of the corresponding `SKILL.md` file into the agent's context as a high-precedence, task-specific prompt that overrides general instructions. The skill files themselves are detailed, multi-step prompts.

## 3. Unknowns

-   The full, default system prompt for the Claude agent is unknown.
-   The exact order and method for how context from `CLAUDE.md`, activated skills, and conversation history are assembled into a final prompt is unknown.
