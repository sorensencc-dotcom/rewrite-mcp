# Gemini Agents

This document outlines the structural definition of Sub-Agents as used by the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Sub-Agent Architecture

-   **Definition:** A Sub-Agent is a specialized, expert agent that the primary Gemini agent can delegate tasks to. This pattern allows the primary agent to orchestrate complex tasks by invoking experts for specific sub-problems.
-   **Invocation:** Sub-Agents are invoked using the `invoke_agent` tool. The primary agent provides the name of the sub-agent and a detailed prompt containing all necessary context and instructions.
-   **Execution Model:** The invocation of a sub-agent is a blocking tool call. The primary agent waits for the sub-agent to complete its task and return a result before proceeding.

## 2. Available Sub-Agents

The following sub-agents are available to the Gemini agent in this environment:

| Agent Name | Description |
|---|---|
| `codebase_investigator` | Specialized for codebase analysis, architectural mapping, and understanding system-wide dependencies. Used for vague requests, bug root-cause analysis, and large-scale refactoring. |
| `cli_help` | Specialized for answering questions about the Gemini CLI application itself, including its features and configuration. |
| `generalist` | A general-purpose AI agent with access to all tools. Used for turn-intensive tasks or processing large amounts of data to keep the main session history lean. |

## 3. Principles of Delegation

-   **Task Specialization:** The primary agent is expected to delegate to the most relevant sub-agent based on the nature of the user's request.
-   **Comprehensive Prompting:** The primary agent is responsible for providing a complete and detailed prompt to the sub-agent to ensure it has all the necessary information to succeed.
