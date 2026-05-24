# AI OS

This directory contains a unified, version-controlled export of the structural state, capabilities, and configurations of all AI systems used in this workspace. It is the single source of truth for the AI architecture.

## Overview

This "AI OS" is generated and managed by the `generate-ai-system-export` skill. It follows the architecture defined in the "Claude developer integration blueprint".

The system performs a multi-stage pipeline:
1.  **Generate:** Raw exports are created from each platform (Claude, Copilot, Gemini).
2.  **Normalize:** Volatile and non-compliant data is stripped from the raw exports.
3.  **Merge:** The normalized data is merged into this unified directory structure.
4.  **Version:** The `VERSION` and `HISTORY.md` files are updated.
5.  **Docs Sync:** The project's documentation is updated to reflect the new state of the AI OS.

## Source of Truth

This directory is the living, canonical representation of the AI systems. It is intended to be consumed by documentation systems, analysis tools, and future AI agents.
