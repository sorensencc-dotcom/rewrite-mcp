# TheFoundry — Deterministic Node.js Build Environment (Phase 0.9)

Sealed, reproducible Docker-based build system for all Node.js subsystems in CIC and Rewrite Labs.

## Quick Start

### Build an app locally
```bash
docker build \
  -t thefoundry-node-build:latest \
  -f images/node-build/Dockerfile \
  --target builder \
  .

docker run --rm -v %CD%/projects/app-main:/app thefoundry-node-build:latest
```

### Run the app
```bash
docker build \
  -t thefoundry-node-runtime:latest \
  -f images/node-runtime/Dockerfile \
  projects/app-main

docker run --rm -p 3000:3000 thefoundry-node-runtime:latest
```

## Directory Structure

- **`/images`** — Dockerfile definitions for build and runtime
- **`/projects`** — Node.js apps to be built with TheFoundry
- **`/ci`** — CI/CD pipeline templates (GitHub Actions, Azure, GitLab)
- **`/docs`** — Documentation (conventions, troubleshooting, patterns)

## Documentation

See `/docs/cic/phase-0-9-thefoundry.md` for the full specification.

## Conventions

1. **npm ci, not npm install** — lock file is source of truth
2. **No npm on host OS** — all npm runs inside container
3. **Multi-stage builds** — test, lint, build in separate layers
4. **Reproducible outputs** — builds produce bit-for-bit identical artifacts

## Support

For issues or questions, see `/docs/TROUBLESHOOTING.md`.
