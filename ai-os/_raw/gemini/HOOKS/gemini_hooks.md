# Gemini Hooks

This document outlines the structural definition of Hooks as used by the Gemini agent.

---
-   **Source:** `VERIFIED`
-   **Confidence:** `High`
---

## 1. Hook Architecture

-   **Definition:** The Gemini agent has a mechanism known as "Hook Context". This is not a hook in the traditional software sense (e.g., a pre-commit hook that executes a script). Instead, it is a mechanism for the external environment to inject read-only data or informational context into the agent's prompt.
-   **Invocation:** This process is automatic and managed by the hosting environment. The agent receives context wrapped in `<hook_context>` XML tags at the beginning of a session or turn.
-   **Nature:** The content within a hook context is treated as read-only, informational data. It does not contain commands and does not override the agent's core instructions or safety guidelines.

## 2. Use Cases

-   **Providing External Data:** A hook could provide the results of an external process that ran before the agent was invoked.
-   **Injecting Session Information:** A hook could be used to provide session-specific information, such as user permissions or environment details.

## 3. Unknowns

-   The full range of external systems or triggers that can provide hook context is unknown to the agent itself. This is determined by the agent's hosting environment.
