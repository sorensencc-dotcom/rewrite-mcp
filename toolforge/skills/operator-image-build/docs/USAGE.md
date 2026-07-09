# Operator Image Build — Usage Guide

Automated deterministic Docker image builds for CIC harness components.

## Installation

```bash
cd toolforge/skills/operator-image-build
npm install
npm run build
```

## CLI Usage

### Build Images Only

```bash
npm start -- --action build --workdir /path/to/cic
```

### Full Pipeline (Build → Tag → Push → Verify)

```bash
npm start -- --action all --registry registry.internal:5000 --verbose
```

### Dry-Run (Preview Commands Without Executing)

```bash
npm start -- --action all --dry-run
```

### Push to Custom Registry

```bash
npm start -- --registry quay.io/myorg --action push
```

### Air-Gapped Node-Local Import

```bash
npm start -- --action import
```

## Programmatic Usage

```typescript
import { main } from './src/index';

const result = await main({
  action: 'all',
  registry: 'registry.internal:5000',
  workdir: '.',
  dryRun: false,
  verbose: true,
});

console.log(result.data.images);
```

## Configuration

```bash
# Via CLI args
npm start -- \
  --action build \
  --registry registry.internal:5000 \
  --workdir /cic \
  --dry-run \
  --verbose

# Via env vars (if extended)
export REGISTRY=registry.internal:5000
npm start -- --action push
```

## Output Examples

**Success (all):**
```json
{
  "status": "ok",
  "message": "All images built, tagged, pushed, and verified",
  "data": {
    "action": "all",
    "images": [
      { "name": "harness-v3", "status": "pushed" },
      { "name": "onnx-sidecar", "status": "pushed" },
      { "name": "registry", "status": "verified", "digest": "harness-v3, onnx-sidecar" }
    ],
    "registry": "registry.internal:5000",
    "duration_ms": 45320
  }
}
```

**Error (missing workdir):**
```json
{
  "status": "error",
  "message": "/nonexistent/path/harness-v3 not found",
  "data": null
}
```

## Troubleshooting

### Docker not in PATH

```bash
# Install Docker or add to PATH
which docker
docker --version
```

### Registry unreachable

```bash
# Test connectivity
curl -s registry.internal:5000/v2/_catalog | jq .
```

### Permission denied (import)

```bash
# ctr needs sudo for containerd access
sudo ctr -n k8s.io images ls
```

### Build fails with Dockerfile error

```bash
# Verify Dockerfiles exist
ls -la ./harness-v3/Dockerfile ./onnx-sidecar/Dockerfile

# Manually test build
docker build -t harness-v3:latest ./harness-v3
```

### Build times out or stalls

Slow filesystem (antivirus scanning, network drives, WSL with poor sync) can cause Docker operations to hang.

**Check environment:**
```bash
# Time filesystem operation
time docker ps

# If > 5s: environment is slow
# Check antivirus exclusions: C:\dev\node_modules, C:\dev\.git, C:\dev\dist
# Or disable real-time scanning temporarily

# For WSL: use native PowerShell, not bash from WSL2
```

See `docs/operations/environment-optimization.md` for detailed mitigation strategies.

## Integration with CI/CD

**GitHub Actions:**
```yaml
- name: Build and push images
  run: |
    npm install
    npm start -- --action all --registry ${{ secrets.REGISTRY }}
```

**Task Scheduler (Windows):**
```powershell
$action = New-ScheduledTaskAction -Execute "npm" -Argument "start -- --action all"
Register-ScheduledTask -TaskName "operator-image-build" -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At 2am)
```

**Kubernetes CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: operator-image-build
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: build
            image: node:20-slim
            command: ["npm", "start", "--", "--action", "all"]
          restartPolicy: OnFailure
```

## Performance Notes

- **Build time:** ~60-90s (depends on base image size, network)
- **Push time:** ~30-60s (depends on image size, network)
- **Verify time:** ~5-10s
- **Total (all):** ~2-3 minutes

## Deterministic Guarantees

✓ SOURCE_DATE_EPOCH=1710000000 in Dockerfiles (reproducible layer hashes)
✓ No git metadata leakage
✓ Multi-stage builds minimize final image size
✓ Registry catalog verified after push
✓ Dry-run mode for safe testing
✓ Timestamped logs for audit trail
