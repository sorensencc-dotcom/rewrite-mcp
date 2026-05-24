# Build and Release System

This document outlines the build and release automation systems, primarily managed through `package.json` scripts and the `mkdocs.yml` configuration.

---
-   **Source:** `VERIFIED` (from `package.json` and `mkdocs.yml`)
-   **Confidence:** `High`
---

## 1. `package.json` Scripts

The `package.json` file in the `rewrite-mcp` root defines the core operational workflows for the project.

-   **`sync-docs`**: Executes `scripts/sync-docs.sh` to copy documentation from various sources into the central `docs/` directory for processing by MkDocs.
-   **`build-docs`**: A more comprehensive documentation workflow that runs `sync-docs` with a `--build` flag (which triggers `mkdocs build --strict`) and then runs `test:links` to check for broken hyperlinks.
-   **`test:*`**: A collection of test runners for different parts of the system (e.g., `test-orchestrator`, `test:links`).
-   **`release:*`**: A suite of scripts for managing software releases.
    -   `release:notes`: Extracts release notes from `CHANGELOG.md`.
    -   `release:diff`: Computes velocity deltas.
    -   `release:timeline`: Updates a dashboard's historical timeline.
    -   `release:tag`: Creates a new version tag.
    -   `release:bundle`: Creates a distribution archive.
-   **`release:full`**: A master script that orchestrates the entire release process by running the documentation and individual release scripts in sequence.

## 2. `mkdocs.yml`

-   **Purpose:** The central configuration file for the MkDocs documentation site generator.
-   **Key Functions:**
    -   Defines the site name, author, and theme.
    -   Defines the navigation structure (`nav:`), which controls the layout of the documentation site. Files not listed in the `nav` section will not appear in the site's navigation.
    -   Configures plugins and markdown extensions.
