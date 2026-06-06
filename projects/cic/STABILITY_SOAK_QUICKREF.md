# CIC Stability Soak — Quick Reference Card

**One-liner restart (Windows):**
```powershell
.\scripts\restart-stability-soak.ps1
```

**One-liner restart (Linux/macOS):**
```bash
npm run orchestrate:stability -- --hours=12
```

---

## 4-Piece Infrastructure Summary

| Piece | File | Purpose | When to Use |
|-------|------|---------|------------|
| **Restart Script** | `scripts/restart-stability-soak.ps1` | Clean process kill + state reset + restart | After crash, every restart |
| **PM2 Supervisor** | `ecosystem.config.js` | Auto-restart on crash, 2GB memory limit | Development/continuous running |
| **systemd Service** | `cic-stability.service` | Init system integration (Linux) | Production deployment |
| **Grafana Alerts** | `provisioning/dashboards/cic-stability-alerts.json` | Fire when metrics stall 5+ min | 24/7 monitoring |

---

## Key Metrics (Update Every 30 Seconds)

- ✅ **Drift Avg** — semantic divergence
- ✅ **Contradiction Avg** — narrative violations
- ✅ **Adversarial Rate** — should climb steadily
- ✅ **Stability Score** — should oscillate

**If any metric flatlines for 5 min** → Process is dead → Restart

---

## Restart Decision Tree

```
Soak crashed?
├─ YES → .\scripts\restart-stability-soak.ps1
│
├─ Want auto-restart on next crash?
│  ├─ YES → pm2 start ecosystem.config.js
│  └─ NO → Stick with manual restart script
│
└─ Want 24/7 production setup (Linux)?
   ├─ YES → sudo systemctl start cic-stability.service
   └─ NO → Use PM2 or manual script
```

---

## Dashboard & Monitoring

**Grafana:** `http://localhost:3000/d/arl-v2-dash?from=now-6h&to=now`

**Health endpoint:** `curl http://localhost:3000/health/stability | jq`

**PM2 monitor:** `pm2 monit`

**systemd logs:** `journalctl -u cic-stability.service -f`

---

## Troubleshooting in 30 Seconds

| Problem | Fix |
|---------|-----|
| **Metrics flatline** | `.\scripts\restart-stability-soak.ps1` |
| **Can't start soak** | Check `npm run orchestrate:stability` exists |
| **OOM killed (2GB)** | Increase `max_memory_restart` in ecosystem.config.js |
| **Process won't restart** | `pm2 delete cic-stability-orchestrate && pm2 start ecosystem.config.js` |
| **Alerts not firing** | Verify Prometheus scrape: `http://prometheus:9090` |

---

## Post-Soak (After 12 Hours)

1. ✅ Verify all 4 metrics completed (no NaN/null)
2. ✅ Export Grafana dashboard as PNG/PDF
3. ✅ Check error count in health endpoint
4. ✅ Archive logs: `gzip -c logs/*.log > archive/soak-2026-06-06.gz`
5. ✅ Review Phase 7.7 confidence thresholds if needed

---

## Links & Files

- **Full Runbook:** See `STABILITY_SOAK_RUNBOOK.md`
- **Restart Script:** `scripts/restart-stability-soak.ps1`
- **PM2 Config:** `ecosystem.config.js`
- **Alerts:** `provisioning/dashboards/cic-stability-alerts.json`
- **Health Endpoint:** `ingestion/src/stability/health-endpoint.js`
- **Related Phases:** See [[arl-phase-7-7-confidence-model]] and [[arl-phase-7-8-drift-calculator]]

---

**Print this card and keep it handy during the 12-hour soak!**
