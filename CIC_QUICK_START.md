# CIC Quick Start — 5 Minutes to Production

**TL;DR**: Deploy the fully-wired CIC service + Operator Console v2

---

## Start CIC Service (Terminal 1)

```bash
cd projects/cic
npm install
npm start
```

**Expected Output:**
```
[CIC] Server running on http://localhost:8080
[CIC] Health check: OK
[CIC] Tracing enabled
```

**Test:**
```bash
curl http://localhost:8080/health
```

---

## Start Operator Console (Terminal 2)

```bash
cd projects/cic-operator-console
npm install
npm run dev
```

**Expected Output:**
```
  VITE v4.5.0  ready in 450ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Visit**: [http://localhost:5173](http://localhost:5173)

---

## What You Get

### Dashboard Page
- Service health status
- Request metrics (total, latency, error rate)
- Cache hit rate

### Flow Explorer
- Execute flows by template ID
- See execution timeline
- View agent outputs

### Agent Performance
- Latency histogram by agent
- Success rate chart

### Settings
- View registered flows
- View registered agents
- See current configuration

### + Context Inspector, CRG Health, Metrics pages

---

## Test a Flow

```bash
# Terminal 3
curl -X POST http://localhost:8080/flow/execute \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "flow-context-enrichment-v1",
    "input": {"context_id": "ctx-demo-001"}
  }'
```

**Response:**
```json
{
  "execution_id": "exec-1717584720000-a1b2c3d4e5"
}
```

**View in Console**: Flow Explorer → paste execution ID → see timeline

---

## Deployment to Production

### Docker

```bash
# Build CIC service
cd projects/cic
docker build -t cic-service:1.0.0 -f Dockerfile .

# Build console
cd projects/cic-operator-console
docker build -t cic-console:1.0.0 -f Dockerfile .

# Run both
docker run -d -p 8080:8080 cic-service:1.0.0
docker run -d -p 5173:5173 -e VITE_CIC_API_URL=http://host.docker.internal:8080 cic-console:1.0.0
```

### Kubernetes

```bash
# Deploy CIC service
kubectl apply -f projects/cic/kubernetes.yaml

# Deploy console
kubectl apply -f projects/cic-operator-console/kubernetes.yaml

# Access
kubectl port-forward svc/cic-context-service 8080:8080
kubectl port-forward svc/cic-operator-console 5173:5173
```

---

## Key Files

| File | Purpose |
| --- | --- |
| `projects/cic/` | CIC service (REST API) |
| `projects/cic-operator-console/` | Web dashboard |
| `CIC_DEPLOYMENT_CHECKLIST.md` | Full deployment sign-off |
| `DEPLOYMENT_SUMMARY.md` | Feature overview |
| `scripts/audit-abm-block.ps1` | Compliance audit |

---

## Troubleshooting

**Service won't start:**
```bash
# Check Node version (need 20+)
node --version

# Check port
lsof -i :8080  # or netstat -ano | findstr :8080

# Check logs
tail -f projects/cic/cic.log
```

**Console won't connect:**
```bash
# Verify service is running
curl http://localhost:8080/health

# Check env var
echo $VITE_CIC_API_URL  # Should be http://localhost:8080
```

---

## Next Steps

1. ✅ Run service + console locally
2. ✅ Test flow execution
3. ✅ View in Operator Console
4. → Deploy to staging
5. → Deploy to production
6. → Integrate real CRG backend
7. → Register agent clients

---

**Ready?** Start Terminal 1 above. You're live in 2 minutes.
