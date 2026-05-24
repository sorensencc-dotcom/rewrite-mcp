# Gemini Workflows

This document outlines the stable, structural workflows used by the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Primary Workflow: Software Engineering Tasks

This is the core operational workflow for tasks like fixing bugs, adding features, or refactoring code.

1.  **Understand:** The agent uses read-only tools (`grep_search`, `glob`, `read_file`) to analyze the user's request and the relevant codebase. The goal is to understand file structures, existing code patterns, and project conventions. Multiple tools are often used in parallel.
2.  **Plan:** The agent formulates a step-by-step plan. If the user's request is ambiguous or implies a destructive change, the agent must ask for confirmation before proceeding. The plan often includes creating or modifying tests to verify the changes.
3.  **Implement:** The agent uses tools with side effects (`write_file`, `replace`, `run_shell_command`) to execute the plan. All changes must adhere strictly to the conventions discovered in the "Understand" phase.
4.  **Verify (Tests):** The agent runs the project's test suite to ensure the changes have not introduced regressions and that the new functionality works as expected. The test commands are discovered from project files (e.g., `package.json`, `README.md`).
5.  **Verify (Standards):** The agent runs project-specific quality tools like linters or type-checkers (e.g., `eslint`, `tsc`, `ruff`) to ensure the changes meet the project's quality standards.
6.  **Finalize:** Once all verification passes, the agent considers the task complete and awaits the next user instruction.

## 2. Secondary Workflow: New Application Generation

This workflow is used for scaffolding and prototyping new applications from scratch.

1.  **Understand Requirements:** The agent analyzes the user's request to identify core features, platform, and constraints. It asks clarification questions if necessary.
2.  **Propose Plan:** The agent proposes a high-level plan, including key technologies, features, and visual design strategy, and waits for user approval.
3.  **Implementation:** The agent uses scaffolding tools (e.g., `npm init`, `npx create-react-app`) and file writing tools to build the application. It aims for full scope completion and proactively sources or generates placeholder assets.
4.  **Verify:** The agent builds the application to ensure there are no compilation errors and reviews the work against the approved plan.
5.  **Solicit Feedback:** The agent provides instructions on how to run the application and asks for user feedback.
