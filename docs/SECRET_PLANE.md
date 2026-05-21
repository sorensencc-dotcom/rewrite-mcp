# CIC Secret Plane (Infisical)

This document defines the architecture and conventions for secret management across the CIC and Rewrite Labs ecosystem.

## 1. The Zero-Plaintext Mandate

- **NO `.env` files** committed to source control or existing on disk in production.
- **NO hardcoded secrets** in source code or configuration files.
- **NO process-level leakage** via shell exports or command-line arguments.

## 2. Infrastructure Topology

- **Single Source of Truth**: Infisical (Managed/Private Cloud).
- **Projects**: Subsystem-scoped (e.g., `cic-orchestrator`, `cic-harvester`).
- **Environments**: Hierarchy of `base` → `dev` / `staging` / `prod-<region>`.

## 3. Reference Implementations

The following services are already "Gold Standard" compliant:

| Service | Prefix | Config Guardrail | Documentation |
|---|---|---|---|
| **Orchestrator** | `ORCH_` | `src/config.js` | [`secrets.md`](projects/cic/orchestrator/secrets.md) |
| **Harvester** | `HARV_` | `src/config.js` | [`secrets.md`](projects/cic/ingestion/secrets.md) |
| **Control Plane**| `CP_` | `src/config.js` | [`secrets.md`](apps/control-plane/secrets.md) |

## 4. Integration Standards

### Service-Scoped Prefixes
To prevent env-collision in shared runtimes, all secrets MUST use service-specific prefixes (e.g., `ORCH_`, `HARV_`).

### Boot-Time Guardrails
Every service must implement a `config.js` module that asserts the presence of required secrets. The service must **fail-fast** if misconfigured.

### Developer Experience
Developers use the Infisical CLI:
```bash
infisical run -- <command>
```

### CI/CD (GitHub Actions)
Use OIDC-based identity authentication via the Infisical Secrets Action.

### Runtime (Kubernetes)
Inject secrets via the Infisical K8s Operator using pod annotations.

---

*Authored by: Antigravity CLI*  
*Date: 2026-05-21*
