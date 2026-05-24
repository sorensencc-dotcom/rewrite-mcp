# Claude Agents

This document outlines the inferred structural definition of Agents for the Claude platform.

---
-   **Source:** `INFERRED` (from `gemini-install.sh` output)
-   **Confidence:** `Low`
---

## 1. Agent Architecture (Inferred)

-   **Definition:** The Claude ecosystem appears to have a concept of "agent personas". This is distinct from Gemini's "Sub-Agent" delegation model.
-   **Nature (Inferred):** A "persona" is likely a specialized configuration or system prompt that makes the entire Claude agent behave like a specific expert (e.g., a "senior architect"). This is probably a mode of operation for the primary agent, rather than a separate agent that is delegated to.

## 2. Inferred Personas

The `gemini-install.sh` script from the `claude-skills` repository provided the following instruction:
> "Activate an agent persona: > activate_skill(name="cs-engineering-lead")"

This implies:
-   Personas are activated using the same `activate_skill` mechanism as regular skills.
-   Personas are defined in `SKILL.md` files, just like other skills.
-   An example of a persona name is `cs-engineering-lead`.

## 3. Unknowns

-   The full list of available agent personas is unknown.
-   The specific structural differences between a "persona" skill file and a regular "task" skill file are unknown, though they likely share the same base format.
-   It is unknown if Claude has a delegation-based "Sub-Agent" architecture similar to Gemini's `invoke_agent`.
