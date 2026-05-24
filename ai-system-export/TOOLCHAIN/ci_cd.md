# CI/CD (Continuous Integration / Continuous Deployment)

This document outlines the CI/CD automation systems found in the `.github/workflows/` directory.

---
-   **Source:** `VERIFIED` (from `.github/workflows/*.yml`)
-   **Confidence:** `High`
---

## 1. `docs.yml`

-   **Purpose:** Governs the build and deployment of the project's documentation site (`mkdocs`).
-   **Trigger:** Runs on pushes to the `master` branch.
-   **Key Steps (Inferred):**
    -   Checks out the code.
    -   Sets up Python and Node.js environments.
    -   Installs project dependencies (`npm ci`).
    -   Runs the `build-docs` script from `package.json` (which in turn runs `sync-docs.sh --build` and `test:links`).
    -   Deploys the generated `site/` directory, likely to GitHub Pages.

## 2. `cic-dashboard-e2e.yml`

-   **Purpose:** Runs end-to-end tests for a "CIC Dashboard".
-   **Trigger:** Appears to be manually triggered (`workflow_dispatch`).
-   **Key Steps (Inferred):**
    -   Checks out the code.
    -   Installs dependencies.
    -   Runs an end-to-end testing command, likely related to Playwright, given the project structure.

## 3. `ai-os-export.yml`

-   **Purpose:** Provides a mechanism for automatically running the `generate-ai-system-export` skill on a schedule.
-   **Trigger:** Runs weekly (`cron: "0 6 * * 1"`) and can be manually dispatched.
-   **Key Steps:**
    -   Checks out the code.
    -   Sets up Node.js.
    -   Installs dependencies (`npm ci`).
    -   Runs a script (`npm run ai-os:export`) which executes the full exporter pipeline.
    -   Commits and pushes the updated `ai-os/` directory if changes are detected.
