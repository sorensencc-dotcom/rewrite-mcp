# CIC Harvester Secrets Management

**Secrets for this service are managed in Infisical.**  
This service adheres to the **Zero-Plaintext Mandate**.

## Infisical Configuration

- **Project:** `cic-harvester`
- **Environments:** 
  - `base`: Global defaults shared across all environments.
  - `dev`: Local development and sandbox settings.
  - `staging`: Integration testing environment.
  - `prod-us-east` / `prod-eu-west`: Regional production overlays.

## Required Secrets

To prevent collisions, all secrets for this service are prefixed with `HARV_`.

| Key | Description | Scope |
|---|---|---|
| `HARV_GEMINI_API_KEY` | Google AI API Key | Global (`base`) |
| `HARV_ANTHROPIC_API_KEY`| Anthropic API Key | Global (`base`) |
| `HARV_TELEMETRY_URL` | Telemetry Ingest Endpoint | Env Specific |
| `HARV_REGION` | Current Region (e.g., `us-east`) | Env Specific |
| `HARV_LLAMA_URL` | Local Llama endpoint (optional) | Dev/Local |

## Local Development

### Allowed Workflows
- `infisical run -- npm start`
- `infisical run -- npm test`

### Explicitly Disallowed
- **NO `.env` files** (even if ignored by git).
- **NO `export KEY=VALUE`** in shell scripts or terminal history.

1. Install Infisical CLI: `brew install infisical/get-cli/infisical`
2. Login via SSO: `infisical login`
3. Link project: `infisical init` (select `cic-harvester`)

## CI/CD (GitHub Actions)

The pipeline uses OIDC for identity-based authentication.

```yaml
- name: Fetch secrets from Infisical
  uses: Infisical/secrets-action@v1
  with:
    oidc-audience: "https://app.infisical.com"
    project-id: "cic-harvester"
    env-slug: "dev"
```

## Runtime (Kubernetes)

```yaml
metadata:
  labels:
    cic.service: harvester
    cic.env: prod
    cic.region: us-east
  annotations:
    infisical.com/inject-secrets: "true"
    infisical.com/project-id: "cic-harvester"
    infisical.com/env-slug: "prod-us-east"
```

## Runtime Guardrails

On boot, the Harvester executes `src/config.js` which asserts the presence of all required `HARV_*` variables.
