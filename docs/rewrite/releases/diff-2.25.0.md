# Release Diff: v2.25.0 vs v2.24.0

## Velocity Delta
- **Total Changes**: 6 (Delta: +0)
- **New Features**: 5 (Delta: +0)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.25.0)
### Added
- **Phase 36: Ford Integration (GAP-004)**: Materialized and executed the third biographical mission focusing on Sorensen's early Ford years (1905-1914).
    - **Mission Control** (`scripts/mission-control.js`): Updated to version 1.1.1. Hardened simulation logic for high-density industrial archives (Ford Piquette and Highland Park plants).
    - **GAP-004 Mission Assets**: Created Goal Manifest, Mission Pack, and hybrid industrial-strict Audit Configuration (`AuditConfig_GAP-004.json`).
    - **Structured Research Block** (`data/GAP-004_Research_Block.json`): Verified 1905 payroll ledger at Piquette, 1910 Highland Park superintendent role, and 1913 moving assembly line signatures.
    - **Narrative Gap Report** (`docs/GAP-004_Narrative_Gap_Report.md`): Finalized report documenting the transition from master patternmaker to industrial architect.
### Changed
- **Mission Control** (`scripts/mission-control.js`): Refactored simulation logic into a switch-like structure for better arc-specific result fidelity.

## Previous Changes (v2.24.0)
### Added
- **Phase 35: Early American Integration (GAP-003)**: Materialized and executed the second biographical mission focusing on Sorensen's early US years (1900-1914).
    - **Mission Control** (`scripts/mission-control.js`): Hardened simulation logic to handle multiple research arcs (Danish Origins vs. US Integration) with arc-specific evidence simulation and subject materialization.
    - **GAP-003 Mission Assets**: Created Goal Manifest, Mission Pack, and biographical-strict Audit Configuration (`AuditConfig_GAP-003.json`).
    - **Structured Research Block** (`data/GAP-003_Research_Block.json`): Verified 1900 Census, Chicago Machinist Union registry (#14), and relocation to Detroit in 1902.
    - **Narrative Gap Report** (`docs/GAP-003_Narrative_Gap_Report.md`): Finalized report documenting the industrial transition from Chicago apprenticeship to Detroit engine shops.
### Changed
- **Mission Control** (`scripts/mission-control.js`): Refactored deliverable generation to be goal-agnostic via target-goal-based filename template.
