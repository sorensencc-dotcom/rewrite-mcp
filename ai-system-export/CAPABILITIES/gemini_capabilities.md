# Gemini Capabilities

This document outlines the verified capabilities of the Gemini agent in this environment, focusing on its available tools.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Filesystem Operations

-   **`list_directory`**: Lists files and subdirectories within a given path.
-   **`read_file`**: Reads the content of a specified file. Can handle text, PDF, and various image and audio formats. Supports reading specific line ranges for text files.
-   **`write_file`**: Writes content to a specified file, creating it if it does not exist or overwriting it if it does.
-   **`replace`**: Replaces a specific string of text within a file, requiring significant context to ensure precision.
-   **`glob`**: Finds files matching glob patterns (e.g., `src/**/*.ts`).

## 2. Code & Text Search

-   **`grep_search`**: Searches for a regular expression pattern within file contents in a specified directory.

## 3. Command Execution

-   **`run_shell_command`**: Executes a shell command in a `bash` environment. Can run commands in the foreground or background.

## 4. Web & Network Access

-   **`google_web_search`**: Performs a web search using Google Search.
-   **`web_fetch`**: Fetches content from a given URL.

## 5. Agent & Session Control

-   **`ask_user`**: Asks the user one or more questions to gather preferences or clarify requirements.
-   **`invoke_agent`**: Delegates a task to a specialized sub-agent.
-   **`activate_skill`**: Loads a skill's instructions into the current context to guide the agent's actions.
-   **`update_topic`**: Manages the narrative flow of the agent's work by publishing topic summaries.
-   **`enter_plan_mode`**: Switches to a read-only planning mode for complex tasks.

## 6. Background Process Management

-   **`list_background_processes`**: Lists active and recently completed background processes started by the agent.
-   **`read_background_output`**: Reads the output log of a specific background process.
