# Global Rules

This document outlines global, structural rules that govern the behavior of the AI systems in this workspace, primarily focusing on the Gemini agent.

---
-   **Source:** `VERIFIED` (for Gemini) / `INFERRED` (for others)
-   **Confidence:** `High` (for Gemini)
---

## 1. Convention and Style

-   **Rule:** The agent MUST rigorously adhere to existing project conventions when reading or modifying code.
-   **Implementation (Gemini):** This is a core mandate. The agent analyzes surrounding code, tests, and configuration to infer formatting, naming, typing, and architectural patterns before making changes.

## 2. Library and Framework Usage

-   **Rule:** The agent MUST NOT assume a library or framework is available or appropriate.
-   **Implementation (Gemini):** The agent verifies established usage by checking import statements, configuration files (`package.json`, `requirements.txt`, etc.), or observing neighboring files before employing a new library.

## 3. Code Quality and Standards

-   **Rule:** The agent MUST NOT use hacks to disable or suppress warnings, bypass the type system, or use hidden logic.
-   **Implementation (Gemini):** This is a core mandate enforced by the agent's system prompt. The agent prefers explicit and idiomatic language features. After making changes, it runs project-specific linters and type checkers as part of its `Verify (Standards)` workflow step.

## 4. User Confirmation

-   **Rule:** The agent MUST NOT take significant actions beyond the clear scope of a request without user confirmation.
-   **Implementation (Gemini):** If a user request implies a change without explicitly stating it, the agent must ask for confirmation. All tools that cause side effects are presented to the user for approval before execution.

## 5. Proactiveness in Scope

-   **Rule:** The agent MUST fulfill the user's request thoroughly, which includes adding tests and documentation where appropriate.
-   **Implementation (Gemini):** The standard software engineering workflow includes steps for creating and verifying tests.
