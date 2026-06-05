# AGENTS.md — projects/cic/

Zone governance for CIC subsystems and CIC/CRG/Ruflo integration layer.

---

## Zone Ownership — CIC Subsystems

| Path | Primary | May Assist | Notes |
|------|---------|-----------|-------|
| `context-api/` | Claude | — | Context API contract, schema, versioning — no edits without architectural review. |
| `context-service/` | Claude | Copilot | Core context inference engine; test stubs via Copilot OK. |
| `crg-adapter/` | Claude | — | CRG structural integration layer — coordinate with CRG maintainers. |
| `ruflo-orchestration/` | Claude | Copilot | Multi-agent flow registry and executor; template generation OK. |
| `observability/` | Claude | — | Tracing, metrics, health checks — contract surface. |
| `config/` | Claude | — | Configuration schema and validation. |
| `tests/` | Copilot | Claude | Test stubs; Claude owns test architecture and integration tests. |
| `docs/` | Gemini | Claude | Research and runbooks; Claude owns architectural docs. |

---

## Cross-Subsystem Rules

1. **Context API is contract-first.** Changes to `context-api/contract.yaml` or `context-api/schema/` require:
   - Backward compatibility verification or explicit version bump
   - HANDOFF.md entry
   - Consumer notification (CRG, Ruflo)

2. **CRG adapter delegates to CRG.** The adapter is a translation layer, not a CRG reimplementation.
   - CRG-internal logic stays in CRG repos
   - Adapter only handles mapping + data transformation
   - CRG contract changes trigger adapter review

3. **Ruflo flows are immutable templates.** Once a flow is registered:
   - Template ID and version are locked
   - Changes require new version registration
   - Old versions remain available for backward compatibility

4. **Observability is always-on.** Every subsystem publishes:
   - Trace spans for all critical paths
   - Health check endpoints
   - Metric tags for routing and analysis

5. **No silent config changes.** All config schema changes require:
   - Migration path for existing deployments
   - Version bump
   - HANDOFF.md entry

---

## Session Start Checklist (CIC Work)

```bash
cat AGENTS.md                          # this file
cat ../docs/cic/CIC_SYSTEM.md          # CIC architecture
cat context-api/CONTRACT.md            # context API contract
git log --oneline -15 -- projects/cic/ # recent CIC changes
```

---

## Escalate to Human (Chris) When

- Context API contract needs major revision
- CRG adapter requires CRG maintainer coordination
- Breaking changes to observability contract
- New subsystem needed (propose in HANDOFF.md first)
