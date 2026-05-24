# Gemini Plugins

This document outlines the structural definition of "Plugins" as they relate to the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Plugin Architecture

-   **Definition:** The Gemini agent does not have a "Plugin" architecture in the traditional sense of third-party installable packages. The equivalent concept is the agent's set of built-in **Tools**.
-   **Nature:** Tools are functions that the LLM can decide to call to interact with its environment. These tools are provided by the hosting environment and are not extensible by the user during a session.
-   **Execution:** The agent generates a "tool call" in its response, specifying the tool name and arguments. The environment executes the tool and returns the output to the agent in the next turn.

## 2. Core Tools (Plugins)

The primary "plugins" available to this agent are its core tools:

-   `list_directory`
-   `read_file`
-   `grep_search`
-   `glob`
-   `replace`
-   `write_file`
-   `run_shell_command`
-   `google_web_search`
-   `ask_user`
-   `invoke_agent`
-   `activate_skill`
-   And others...

A complete list of available tools and their schemas constitutes the agent's "plugin" capability set. This is documented in more detail in the `CAPABILITIES/gemini_capabilities.md` file.
