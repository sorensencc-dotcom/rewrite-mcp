# Claude Workflows

This document outlines the inferred structural workflows for the Claude platform.

---
-   **Source:** `INFERRED` (from skill file contents, e.g., `research-capture.md`)
-   **Confidence:** `Medium`
---

## 1. Skill-Defined Workflows

-   **Nature:** Claude's workflows appear to be explicitly defined within the `SKILL.md` files themselves. A skill is not just a prompt; it is a complete, step-by-step workflow for the agent to follow.
-   **Example (`research-capture` skill):**
    1.  **Orient:** Get context and project information.
    2.  **Extract Findings:** Classify information from source materials.
    3.  **Route to Documents:** Determine which target files need updates.
    4.  **Draft Updates:** Generate the new content in the correct format.
    5.  **Output:** Present the drafted updates to the user.
    6.  **Flag Treatment Implications:** Identify and flag related tasks for other skills.

## 2. Inferred General Workflow

While specific workflows are defined in skills, a general pattern can be inferred:

1.  **Activate Skill/Persona:** The user or the agent activates a specific skill or agent persona to handle the task.
2.  **Follow Skill Instructions:** The agent executes the steps defined in the activated skill's `SKILL.md` file.
3.  **Interact and Draft:** The agent interacts with the user for clarification (if the skill allows) and presents drafted changes or results for approval before finalizing them.
4.  **Flag Dependencies:** The workflow often concludes by flagging the need for subsequent actions or skills, enabling skill-chaining.

## 3. Unknowns

-   The overarching workflow for tasks that do not fit a pre-defined skill is unknown.
-   The workflow for how the Claude agent interacts with MCP servers or Web Connectors is unknown.
