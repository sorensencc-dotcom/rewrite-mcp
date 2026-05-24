# Gemini Skills

This document outlines the structural definition of Skills as used by the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Skill Architecture

-   **Definition:** A Gemini Skill is a structured set of instructions, stored in a Markdown file (typically `SKILL.md` or a descriptive name like `my-skill.md`), designed to guide the agent in performing a complex, reusable task.
-   **Activation:** Skills are loaded into the agent's context using the `activate_skill` tool. Once activated, the instructions within the skill take high precedence in guiding the agent's subsequent actions for the duration of that task.

## 2. Skill File Format

A skill file is a standard Markdown file with a required YAML frontmatter block.

### 2.1. YAML Frontmatter

The frontmatter provides metadata that allows the agent (and other tools) to understand and index the skill.

-   **`name` (Required):** A unique, machine-readable identifier.
-   **`description` (Required):** A concise, single-sentence explanation of the skill's purpose. This is critical for the agent to decide when to use the skill.

**Example:**
```yaml
---
name: generate-ai-system-export
description: Generates a complete, structured export of all known AI system configurations, memories, skills, and rules for cross-platform consolidation.
---
```

### 2.2. Markdown Body

The body of the file contains the detailed instructions for the agent, written in clear, structured Markdown.

-   **Structure:** Best practices include using headings for logical steps, tables for structured data, and code blocks for examples.
-   **Content:** The instructions should be explicit, outlining the goal, required inputs, step-by-step procedure, and expected output format.

## 3. Skill Discovery & Management

-   **Location:** Skills are typically stored in a project-specific `skills/` directory.
-   **Enforcement:** A `CONTRIBUTING.md` file and a pre-commit hook have been established in this project to enforce the standard format for all new skills, ensuring they remain shareable and portable.
