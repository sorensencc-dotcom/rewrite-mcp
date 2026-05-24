# Claude Skills

This document outlines the inferred structural definition of Skills for the Claude platform.

---
-   **Source:** `INFERRED` (from `claude-skills` repo, `deploy-skill.js` script, `gemini-install.sh` output)
-   **Confidence:** `High`
---

## 1. Skill Architecture (Inferred)

-   **Definition:** A Claude Skill appears to be functionally identical to a Gemini Skill: a set of structured instructions in a markdown file to guide an agent.
-   **Invocation (Inferred):** The `deploy-skill.js` script mentions invoking skills in "Cowork" via a slash command (e.g., `/my-skill-name`). The `gemini-install.sh` script (from the `claude-skills` repo) mentions using `activate_skill(name="...")` for Gemini, implying the same skill content can be used by different loaders.

## 2. Skill File Format (Inferred)

The format is consistent with Gemini skills, reinforcing the idea of a shared, portable standard.

-   **Directory Structure:** Skills are deployed into their own directory (e.g., `my-skill-name/`).
-   **File Name:** The instruction file within the directory must be named `SKILL.md`.
-   **File Content:** The `SKILL.md` file must contain YAML frontmatter with `name` and `description` keys, followed by a Markdown body.

## 3. Skill Discovery & Management (Inferred)

-   **Local Deployment:** The `deploy-skill.js` script is designed to deploy skills to a specific, local directory on the user's machine, where the Claude Desktop/Cowork agent can load them.
-   **Cross-Platform Installation:** The `gemini-install.sh` script from the `claude-skills` repository demonstrates that a collection of Claude-style skills can be "installed" for use by a Gemini agent, confirming their portability.
