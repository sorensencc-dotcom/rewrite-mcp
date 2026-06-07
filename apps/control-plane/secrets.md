# CIC Control Plane Secrets Management

**Secrets for this service are managed in Infisical.**  
This service adheres to the **Zero-Plaintext Mandate**.

## Infisical Configuration

- **Project:** `cic-control-plane`
- **Environments:** 
  - `base`: Global defaults (SSO IDs, etc.).
  - `dev`: Local development settings.
  - `staging`: Integration testing environment.
  - `prod`: Primary production environment.

## Required Secrets

To prevent collisions, all secrets for this service are prefixed with `CP_`.

| Key | Description | Scope |
|---|---|---|
| `CP_GOOGLE_CLIENT_ID` | Google SSO Client ID | Global (`base`) |
| `CP_ALLOWED_EMAILS` | SSO Auth Allow-list | Env Specific |
| `CP_TELEMETRY_URL` | Telemetry Ingest Endpoint | Env Specific |
| `CP_REGION` | Current Region (e.g., `us-east`) | Env Specific |
| `CP_AUTH_DISABLED` | Skip auth check (local only) | Dev |

## Local Development

### Allowed Workflows
- `infisical run -- npm start`

### Explicitly Disallowed
- **NO `.env` files**.
- **NO `export KEY=VALUE`** in shell.

1. Install Infisical CLI: `brew install infisical/get-cli/infisical`
2. Login via SSO: `infisical login`
3. Link project: `infisical init` (select `cic-control-plane`)

## CI/CD (GitHub Actions)

Uses OIDC identity-based authentication.

```yaml
- name: Fetch secrets from Infisical
  uses: Infisical/secrets-action@v1
  with:
    oidc-audience: "https://app.infisical.com"
    project-id: "cic-control-plane"
    env-slug: "dev"
```

## Runtime (Kubernetes)

```yaml
metadata:
  labels:
    cic.service: control-plane
    cic.env: prod
  annotations:
    infisical.com/inject-secrets: "true"
    infisical.com/project-id: "cic-control-plane"
    infisical.com/env-slug: "prod"
```

## Runtime Guardrails

On boot, the Control Plane executes `src/config.js` which asserts the presence of required `CP_*` variables.
