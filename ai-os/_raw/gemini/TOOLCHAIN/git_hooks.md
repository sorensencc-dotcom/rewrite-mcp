# Git Hooks

This document outlines the automated Git Hook system, managed by Husky.

---
-   **Source:** `VERIFIED` (from `.husky/pre-commit`)
-   **Confidence:** `High`
---

## 1. Architecture

-   **Tool:** Husky is used to manage Git hooks.
-   **Configuration:** The setup is managed via `package.json` (`"prepare": "husky"`) and the `.husky/` directory.
-   **Hook:** The project currently uses one Git hook: `pre-commit`.

## 2. `pre-commit` Hook

-   **Purpose:** This script runs automatically before a commit is finalized. If the script exits with a non-zero status code, the commit is aborted.
-   **Location:** `.husky/pre-commit`
-   **Key Steps:**
    1.  **Boilerplate:** The script starts with boilerplate to properly source the `husky.sh` environment (`. "$(dirname -- "$0")/_/husky.sh"`).
    2.  **Secret Scan:** It runs a command (`git diff --cached --name-only | xargs grep ...`) to scan all staged files for patterns that look like common API keys or secrets (e.g., Google `AIza...` keys, AWS `AKIA...` keys).
    3.  **Abort on Failure:** If a potential secret is found, the script prints a critical error message and exits with status code 1, blocking the commit.
    4.  **Pass:** If no secrets are found, the script prints a success message and exits with status code 0, allowing the commit to proceed.
