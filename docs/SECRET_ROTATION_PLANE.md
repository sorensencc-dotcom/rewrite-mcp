# CIC Secret Rotation Plane

This document defines the policies and procedures for rotating secrets across the CIC and Rewrite Labs ecosystem.

## 1. Principles

- **Zero Downtime**: Services must tolerate rotation without interruption.
- **Staged Cutover**: Use `ACTIVE` and `NEXT` slots for gradual migration.
- **Auditable**: Every rotation event must be logged with a timestamp.
- **Scripted**: Rotation must be performed via approved tools to ensure consistency.

## 2. Rotation Matrix

| Secret Group | Key Prefix | Cadence | Procedure |
|---|---|---|---|
| **Google Gemini** | `*_GEMINI_API_KEY` | 90 Days | [`PROC-01`](#proc-01-google-gemini-rotation) |
| **Anthropic Claude**| `*_ANTHROPIC_API_KEY` | 90 Days | [`PROC-02`](#proc-02-anthropic-claude-rotation) |
| **Telemetry Tokens**| `*_TELEMETRY_TOKEN` | 180 Days | [`PROC-03`](#proc-03-internal-token-rotation) |

## 3. Procedures

### PROC-01: Google Gemini Rotation

1. **Stage New Key**:
   - Generate a new key in the Google AI Studio console.
   - Run: `node tools/rotation/rotate.js --service orchestrator --provider gemini --key <NEW_KEY>`
   - This sets `ORCH_GEMINI_API_KEY_NEXT` and `ORCH_GEMINI_API_KEY_ROTATED_AT`.

2. **Verify & Cutover**:
   - Verify the new key (optional test run).
   - Run: `node tools/rotation/rotate.js --service orchestrator --provider gemini --action cutover`
   - This copies `NEXT` → `ACTIVE`.

3. **Cleanup**:
   - Once confirmed stable, revoke the old key in the Google console.
   - Run: `node tools/rotation/rotate.js --service orchestrator --provider gemini --action clear-next`

## 4. Automation

The `tools/rotation/rotate.js` script is the canonical tool for performing these operations. It interacts directly with Infisical to manage the `_ACTIVE` and `_NEXT` slots.

---

*Authored by: Antigravity CLI*  
*Date: 2026-05-21*
