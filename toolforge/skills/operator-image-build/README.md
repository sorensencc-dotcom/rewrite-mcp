# Operator Image Build

Deterministic Docker image build, tag, and push automation for CIC harness components.

Builds `harness-v3` and `onnx-sidecar` with reproducible layer hashes (SOURCE_DATE_EPOCH), pushes to registry, verifies catalog, and supports air-gapped node-local import.

## Quick Start

```bash
# Build, tag, push, verify all in one
npm run build && npm start

# Or specify action
npm start -- --action build --verbose

# Dry-run to see commands without executing
npm start -- --action all --dry-run
```

## Actions

- **build** — docker build harness-v3 and onnx-sidecar
- **tag** — docker tag with registry prefix
- **push** — docker push to registry
- **verify** — curl registry /v2/_catalog
- **import** — ctr -n k8s.io images import (air-gapped)
- **all** — build → tag → push → verify (default)

## Configuration

| Param | Type | Default | Purpose |
|-------|------|---------|---------|
| `action` | string | "all" | Action to run |
| `registry` | string | "registry.internal:5000" | Registry endpoint |
| `workdir` | string | "." | Directory containing image subdirs |
| `dryRun` | boolean | false | Log commands without executing |
| `verbose` | boolean | true | Detailed output |

## Examples

**Build only (no registry):**
```bash
npm start -- --action build --workdir /path/to/cic
```

**Push to custom registry:**
```bash
npm start -- --action all --registry quay.io/myorg --verbose
```

**Air-gapped import on node:**
```bash
npm start -- --action import --dryRun false
```

## Output

Success:
```json
{
  "status": "ok",
  "message": "All images built, tagged, pushed, and verified",
  "data": {
    "action": "all",
    "images": [
      {
        "name": "harness-v3",
        "status": "pushed",
        "digest": "sha256:abc123..."
      },
      {
        "name": "onnx-sidecar",
        "status": "pushed",
        "digest": "sha256:def456..."
      }
    ],
    "registry": "registry.internal:5000",
    "duration_ms": 45320
  }
}
```

## Deterministic Guarantees

✓ SOURCE_DATE_EPOCH sealed in Dockerfiles (reproducible layer hashes)
✓ No git metadata leakage
✓ Multi-stage builds (minimal final image size)
✓ Registry catalog verified after push
✓ Air-gapped import supported (node-local containerd)
✓ Dry-run mode for safe testing

## Troubleshooting

**Docker not found:**
```bash
# Ensure docker is installed and in PATH
which docker
docker --version
```

**Registry unreachable:**
```bash
# Test connectivity
curl https://registry.internal:5000/v2/_catalog
```

**Build fails:**
```bash
# Check Dockerfiles in harness-v3/ and onnx-sidecar/
ls -la ./harness-v3/Dockerfile ./onnx-sidecar/Dockerfile

# Rebuild manually to see error
docker build -t harness-v3:latest ./harness-v3
```

**Permission denied (air-gapped import):**
```bash
# ctr requires sudo
sudo ctr -n k8s.io images import /tmp/harness-v3.tar
```

## Related Documentation

- [Reproducible Dockerfiles](../../docs/deployment/reproducible-dockerfiles.md)
- [Registry Configuration](../../docs/deployment/registry-config.md)
- [Air-Gapped Import](../../docs/deployment/airgapped-import.md)
- [Convergence Trace](../../docs/deployment/convergence-trace.md)
