# Contributing to the MCP Skill Library

This document outlines the standards for creating new, shareable skills for the MCP (Monorepo Control Plane) ecosystem. Adhering to these standards ensures that skills are portable and understandable by different AI models (Gemini, Claude) and discoverable by developer tools (GitHub Copilot).

## The Shareable Skill Standard

A "shareable skill" is a structured Markdown file (`.md`) that defines a capability for an AI agent.

### 1. File Location

All new project-specific skills **must** be placed in the `rewrite-mcp/skills/` directory.

### 2. File Format

Each skill file must contain two parts: a YAML frontmatter block and a Markdown body.

#### YAML Frontmatter

The file must begin with a YAML frontmatter block, enclosed by `---`. This block must contain at least two keys:

-   `name`: A unique, machine-readable identifier for the skill (e.g., `web-regression`, `treatment-update`).
-   `description`: A concise, one-sentence explanation of what the skill does. This is used by agents to determine when to use the skill.

**Example:**

```yaml
---
name: research-capture
description: Intelligently routes research findings (notes, images, documents) to the correct project files and drafts the updates.
---
```

#### Markdown Body

The body of the skill should be written in clear, structured Markdown. It should act as a set of instructions for an AI model.

**Best Practices:**
-   Use headings (`#`, `##`) to break the skill into logical steps.
-   Use tables, lists, and code blocks to structure information clearly.
-   Provide concrete examples of inputs and outputs.
-   Explicitly state any assumptions or required context.
-   If the skill depends on another skill, reference it by name.

### 3. Enforcement

To ensure all new skills meet this standard, a pre-commit hook is in place. This hook automatically runs a validation script on any new or modified file within the `rewrite-mcp/skills/` directory.

If a file does not meet the standard (e.g., missing frontmatter, incorrect format), the commit will be blocked with an error message explaining the issue. This guarantees that only compliant, shareable skills are added to the repository.
