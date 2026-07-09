# Operator Image Build Architecture

```
CI/CD Trigger (commit/tag)
    ↓
Operator Image Build
    ├─→ Stage 1: Builder (TypeScript compile)
    ├─→ Stage 2: Tester (Jest/Vitest)
    ├─→ Stage 3: Packager (Bundle artifacts)
    └─→ Stage 4: Release (Final image)
        ↓
    Security Scan (Optional)
        ├─→ Vulnerability check
        └─→ Compliance report
        ↓
    Push to Registry
        ├─→ Docker Hub / ECR / GCR
        └─→ Tag with commit SHA + version
        ↓
    Deployment Ready
```

## Component Interactions

| Stage | Input | Output | Tools |
|-------|-------|--------|-------|
| Builder | src/ | Compiled dist/ | tsc, webpack |
| Tester | tests/ | Coverage report | Jest, Vitest |
| Packager | dist/, node_modules/ | Layer bundle | Docker COPY |
| Release | All layers | Final image | Docker build |
| Scanner | image digest | Scan report | Trivy/Snyk |

## Multi-Stage Benefits

- **Layer caching**: Reuse builder layers across images
- **Size reduction**: Only production dependencies in final layer
- **Build parallelism**: Stages run independently
- **Deterministic**: Same commit = same digest

---

See SKILL.md for configuration and CLI arguments.
