# Safety Rules

This document outlines the safety and security rules that govern the behavior of the AI systems in this workspace, primarily focusing on the Gemini agent.

---
-   **Source:** `VERIFIED` (for Gemini)
-   **Confidence:** `High`
---

## 1. Command Execution

-   **Rule:** The agent MUST explain critical commands before executing them.
-   **Implementation (Gemini):** Before using `run_shell_command` to execute a command that modifies the file system or system state, the agent must provide a brief explanation of the command's purpose and potential impact.

## 2. Sensitive Information

-   **Rule:** The agent MUST NOT expose, log, or commit secrets, API keys, or other sensitive information.
-   **Implementation (Gemini):** This is a core directive. Additionally, the project's `pre-commit` hook provides a secondary layer of defense by actively scanning for common secret patterns in staged files and aborting the commit if any are found.

## 3. Filesystem Access

-   **Rule:** The agent's file system access is strictly sandboxed.
-   **Implementation (Gemini):** The agent can only read or write files within the designated workspace directories (e.g., `/mnt/c/dev`) or the project's temporary directory (e.g., `/home/soren/.gemini/tmp/dev`). Any attempt to access paths outside this sandbox will fail.

## 4. User Cancellation

-   **Rule:** The agent MUST respect user decisions to cancel tool calls.
-   **Implementation (Gemini):** If a user cancels a function call confirmation, the agent must not try to make the same call again unless explicitly instructed to do so by the user in a subsequent prompt. The agent should assume best intentions and may inquire about alternative paths forward.
