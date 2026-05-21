# CIC Orchestrator Secrets Management

**Secrets for this service are managed in Infisical.**  
This service adheres to the **Zero-Plaintext Mandate**.

## Infisical Configuration

- **Project:** `cic-orchestrator`
- **Environments:** 
  - `base`: Global defaults shared across all environments.
  - `dev`: Local development and sandbox settings.
  - `staging`: Integration testing environment.
  - `prod-us-east` / `prod-eu-west`: Regional production overlays.

## Required Secrets

To prevent collisions, all secrets for this service are prefixed with `ORCH_`.

| Key | Description | Scope |
|---|---|---|
| `ORCH_GEMINI_API_KEY` | Google AI API Key | Global (`base`) |
| `ORCH_ANTHROPIC_API_KEY`| Anthropic API Key | Global (`base`) |
| `ORCH_TELEMETRY_URL` | Telemetry Ingest Endpoint | Env Specific |
| `ORCH_REGION` | Current Region (e.g., `us-east`) | Env Specific |
| `ORCH_LLAMA_URL` | Local Llama endpoint (optional) | Dev/Local |

## Local Development

### Allowed Workflows
- `infisical run -- npm start`
- `infisical run -- npm test`

### Explicitly Disallowed
- **NO `.env` files** (even if ignored by git).
- **NO `export KEY=VALUE`** in shell scripts or terminal history.
- **NO hardcoded keys** in source code or `config.js`.

1. Install Infisical CLI: `brew install infisical/get-cli/infisical`
2. Login via SSO: `infisical login`
3. Link project: `infisical init` (select `cic-orchestrator`)

## CI/CD (GitHub Actions)

The pipeline uses OIDC for identity-based authentication (no static secrets in GitHub).

```yaml
- name: Fetch secrets from Infisical
  uses: Infisical/secrets-action@v1
  with:
    # OIDC authentication (recommended)
    oidc-audience: "https://app.infisical.com"
    project-id: "cic-orchestrator"
    env-slug: "dev"
```

*Note: If OIDC is unavailable, use scoped Machine Identities restricted to this project and environment.*

## Runtime (Kubernetes)

Secrets are injected via the Infisical Kubernetes Operator using pod annotations.

```yaml
metadata:
  labels:
    cic.service: orchestrator
    cic.env: prod
    cic.region: us-east
  annotations:
    infisical.com/inject-secrets: "true"
    infisical.com/project-id: "cic-orchestrator"
    infisical.com/env-slug: "prod-us-east"
```

## Runtime Guardrails

On boot, the Orchestrator executes `src/config.js` which asserts the presence of all required `ORCH_*` variables. If any are missing or empty, the process will fail-fast with a `FATAL_SECRET_MISCONFIGURATION` error.
