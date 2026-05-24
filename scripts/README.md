# Project Scripts

This directory contains operational and deployment scripts for the `rewrite-mcp` project.

## `deploy-skill.js`

A Node.js script for deploying skills to the local Claude agent's "Cowork" environment.

### Features

-   Validates the skill name against project conventions.
-   Validates the `SKILL.md` content for correct YAML frontmatter (`name`, `description`).
-   Deploys the skill by creating a directory and `SKILL.md` file in the target location.
-   Verifies the deployment and checks for readiness to be registered in Cowork.

### Usage

```bash
node scripts/deploy-skill.js <skill-name> <path-to-skill.md>
```

**Example:**
```bash
node scripts/deploy-skill.js my-new-skill ./path/to/my-new-skill.md
```

### Configuration

The script deploys to a specific directory on your local machine. This path can be configured via an environment variable.

-   **Variable:** `CLAUDE_SKILLS_DIR`
-   **Purpose:** Set this to the absolute path of your local Claude agent's `skills` directory.

**How to Set the Environment Variable:**

*   **Windows (Command Prompt):**
    ```cmd
    set CLAUDE_SKILLS_DIR="C:/Path/To/Your/Claude/Skills"
    ```
*   **Windows (PowerShell):**
    ```powershell
    $env:CLAUDE_SKILLS_DIR="C:/Path/To/Your/Claude/Skills"
    ```
*   **macOS / Linux:**
    ```bash
    export CLAUDE_SKILLS_DIR="/path/to/your/claude/skills"
    ```

If the `CLAUDE_SKILLS_DIR` environment variable is not set, the script will use a hardcoded default path as a fallback.
