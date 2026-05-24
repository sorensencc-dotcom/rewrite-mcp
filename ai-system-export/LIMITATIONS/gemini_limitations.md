# Gemini Limitations

This document outlines the verified operational limitations of the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Filesystem and Environment

-   **Sandbox:** The agent is strictly sandboxed and cannot access any file paths outside of the designated workspace and temporary directories.
-   **No Direct Environment Modification:** The agent cannot permanently modify the user's shell environment (e.g., setting environment variables for future sessions). Changes made with `export` in `run_shell_command` only apply to that specific command's sub-shell.
-   **Tool Unavailability:** The agent is dependent on the tools provided by its host environment. If a tool is not available (e.g., `unzip`), the agent must find a workaround using the tools it does have (e.g., using `python`'s `zipfile` module).

## 2. State and Memory

-   **Stateless Sessions:** The agent is fundamentally stateless between sessions. All long-term memory is managed explicitly through files (`GEMINI.md`, `MEMORY.md`).
-   **Context Window:** Like all LLMs, the agent has a finite context window. It cannot remember the entire history of an extremely long conversation or the full content of very large files. The hosting environment's truncation of file and tool outputs is a hard limitation.

## 3. Tool Interaction

-   **Tool Call Failures:** The agent's tools can fail for various reasons (invalid paths, permissions, network errors, incorrect parameters). The agent must be able to interpret the error output and either correct its approach or inform the user.
-   **Tool Output Interpretation:** The agent's ability to act is limited by its ability to correctly interpret the output of its tools. If a command produces unexpected or ambiguous output, the agent may become confused.
-   **File Writing Precision:** The `write_file` and `replace` tools can be prone to errors if the agent is not extremely precise, especially with special characters and escaping, as demonstrated during the `validate-skill.js` creation process.
