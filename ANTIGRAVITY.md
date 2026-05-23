# Antigravity CLI Mandates

This file defines the foundational mandates for the Antigravity CLI in this workspace. These instructions take absolute precedence over general defaults.

## Core Mandates

### 1. Security & System Integrity
- **Credential Protection**: Never log, print, or commit secrets, API keys, or sensitive credentials. Rigorously protect `.env` files and system configuration.
- **Source Control**: Do not stage or commit changes unless specifically requested.

### 2. Engineering Standards
- **Contextual Precedence**: Instructions in `ANTIGRAVITY.md` are the ultimate source of truth.
- **Conventions & Style**: Adhere to existing workspace conventions. Use surgical updates.
- **Types & Safety**: Maintain structural integrity and type safety. Avoid hacks.
- **Design Patterns**: Prioritize explicit composition and delegation.

### 3. Antigravity Ecosystem Integration
- **Gemini 3.5 Flash**: Default to the Gemini 3.5 Flash model for all agentic tasks.
- **Multi-Agent Orchestration**: Support parallel agent execution and subagent workflows.
- **Background Tasks**: Utilize background scheduling for long-running processes.
- **DocSync Mandate**: All project-specific and tool-specific docs must be kept in sync with the MkDocs site using `npm run sync-docs`.
- **Doc Update Mandate**: After every successful build or phase completion, execute [`skills/doc-update.md`](skills/doc-update.md). Policy is defined in [`docs/DOC_POLICY.md`](docs/DOC_POLICY.md). The living roadmap is at [`docs/ROADMAP.md`](docs/ROADMAP.md). No phase is complete without a changelog entry, roadmap update, and Suggestion Log pass.
- **Doc Drift Mandate**: Documentation must never drift from code. Execute `npm run doc:drift` to verify that latest changes are reflected in the changelog and roadmap. This check is mandatory before declaring any phase complete.

### 4. Visual Identity & Design System
- **Cast Iron Charlie (CIC)**: All user-facing interfaces (dashboards, telemetry, internal tools) and documentation (MkDocs, Markdown reports) MUST adhere to the **Cast Iron Charlie** design system.
- **Color Palette**: Use the "Iron & Ember" palette: Black (#0a0806), Forge (#1a1410), Iron (#2c2420), Ember (#C4501A), Brass (#B8922A), and Bone (#e8e0d4).
- **Typography**: Primary headers use 'Playfair Display' (900/700). Body text uses 'Libre Baskerville'. UI labels and buttons use 'Barlow Condensed'.
- **Design Constraints**: Enforce a **Zero Border Radius** policy (sharp corners only). Shadows should be avoided or used minimally as flat overlays.
- **Central Authority**: `rewrite-mcp/apps/operator-ui/css/colors_and_type.css` is the canonical reference for tokens.

## Development Lifecycle
Operate using a **Research -> Strategy -> Execution** lifecycle.
1. **Research**: Map the codebase and validate assumptions.
2. **Strategy**: Formulate a grounded plan.
3. **Execution**: Iterate through **Plan -> Act -> Validate**.

## Validation
Validation is mandatory. No change is complete without empirical verification through tests and workspace standards.
