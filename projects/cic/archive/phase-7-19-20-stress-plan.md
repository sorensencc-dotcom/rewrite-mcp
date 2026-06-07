# Phase 7.19–7.20 — Workload Stress Test Plan
**Status:** Ready to Schedule  
**Baseline:** 12-hour stability soak (2026-06-06)

---

## Objective

Validate ARL under **realistic documentary workload stress** — multiple competing inference requests, threshold adaptations, narrative coherence under load.

---

## Test Phases

### Phase 7.19 — Adaptive Threshold Testing

**Duration:** 24 hours  
**Load Profile:** Ramp-up stress test

**Hour 1–4: Baseline**
- 10 concurrent inference requests/minute
- Normal adversarial rate ~5000%
- Monitor: Threshold stability, no recalibration needed

**Hour 5–8: Sustained Load**
- 50 concurrent requests/minute
- Target: Trigger threshold adaptation (Phase 7.18)
- Monitor: Does system auto-adjust thresholds?
- Expected: Thresholds should tighten by 5–10%

**Hour 9–12: Spike Stress**
- 100 concurrent requests/minute (100x baseline)
- Adversarial rate should jump to 8000%+
- Monitor: Threshold adaptation rate
- Expected: Rapid recalibration, score variance increases

**Hour 13–16: Recovery**
- Drop to 20 concurrent/minute
- Monitor: Threshold relaxation back to baseline
- Expected: Gradual return (not immediate)

**Hour 17–24: Oscillating Load**
- Alternate 10 ↔ 50 ↔ 100 requests/min every 2 hours
- Monitor: Hysteresis in threshold adaptation
- Expected: Smooth tracking, no oscillation artifacts

**Success Criteria:**
- ✅ No process crashes
- ✅ Thresholds adapt within 2–5 cycles
- ✅ No threshold oscillation >±5%
- ✅ Confidence scores remain valid through transitions

---

### Phase 7.20 — Narrative Coherence Under Load

**Duration:** 48 hours  
**Load Profile:** Sustained documentary workload

**Hours 1–12: Baseline Documentary**
- 100 concurrent expansion requests
- 10 competing narrative branches
- Monitor: Drift/contradiction ratio, stability
- Expected: Tight coupling maintained

**Hours 13–24: Adversarial Narrative Injection**
- 5 deliberately contradictory expansions injected
- System must detect and reject/flag
- Monitor: Contradiction spike, alert response
- Expected: Contradiction jumps to 0.40+, confidence drops

**Hours 25–36: Recovery & Adaptation**
- Remove adversarial narratives
- Monitor: System re-equilibration
- Expected: Contradiction returns to 0.24 range within 2 hours

**Hours 37–48: Mixed Load Stress**
- 50% legitimate, 50% edge-case adversarial narratives
- Monitor: Precision/recall of rejection
- Expected: >85% true rejection rate

**Success Criteria:**
- ✅ False reject rate <10%
- ✅ Contradiction detection <5 min
- ✅ Recovery time <2 hours
- ✅ System remains stable under mixed load

---

## Test Infrastructure

### Synthetic Load Generator

```javascript
// scripts/stress-load-generator.js
class LoadProfile {
  constructor(concurrencyLevel, rampDuration, narrativeBranches) {
    this.concurrency = concurrencyLevel;
    this.rampDuration = rampDuration;
    this.branches = narrativeBranches;
    this.startTime = Date.now();
  }

  async generateLoad() {
    const requests = [];
    for (let i = 0; i < this.concurrency; i++) {
      const branch = this.branches[i % this.branches.length];
      requests.push(this.generateExpansionRequest(branch));
    }
    return Promise.all(requests);
  }

  generateExpansionRequest(narrative) {
    return {
      type: 'arl_expansion',
      narrative,
      timestamp: Date.now(),
      adversarial: Math.random() < 0.05 // 5% adversarial
    };
  }
}

// Ramp profile: 10 → 50 → 100 over hours
const profiles = [
  new LoadProfile(10, 4, narratives),   // Hour 1-4
  new LoadProfile(50, 4, narratives),   // Hour 5-8
  new LoadProfile(100, 4, narratives),  // Hour 9-12
  // ... etc
];
```

### Metrics Capture

Add to stability soak metrics:
- `arl_expansion_latency_p99` — 99th percentile request latency
- `arl_threshold_adaptations` — count of threshold changes
- `arl_false_rejects` — rejected legitimate expansions
- `arl_false_accepts` — accepted invalid expansions
- `arl_recovery_time` — time to re-equilibrate after stress

---

## Success Metrics

| Metric | Target | Pass/Fail |
|--------|--------|-----------|
| Process Uptime | 100% | ✅ Both phases |
| Latency P99 | <5s | ✅ Phase 7.19 |
| Threshold Oscillation | <±5% | ✅ Phase 7.19 |
| False Reject Rate | <10% | ✅ Phase 7.20 |
| False Accept Rate | <5% | ✅ Phase 7.20 |
| Recovery Time | <2h | ✅ Phase 7.20 |
| Contradiction Detection | <5m | ✅ Phase 7.20 |

---

## Execution Schedule

```
Week 1 (Jun 10-14):
  Mon-Tue:  Stress generator development & testing
  Wed:      Phase 7.19 dry-run (12h test)
  Thu-Fri:  Phase 7.19 full run (24h)

Week 2 (Jun 17-21):
  Mon-Wed:  Phase 7.20 dry-run + refinement
  Thu-Fri:  Phase 7.20 full run (48h, starts Thu)

Week 3 (Jun 24-26):
  Mon:      Analysis & threshold tuning
  Tue-Wed:  A/B testing with Phase 7.7 updates
```

---

## Rollback Plan

**If Phase 7.19 fails (threshold adaptation broken):**
- Disable threshold adaptation (Phase 7.18)
- Use static thresholds from Phase 7.7
- Continue to Phase 7.20

**If Phase 7.20 fails (narrative coherence degraded):**
- Reduce load to 30 concurrent (Phase 7.20-lite)
- Debug narrative branch isolation
- Add explicit branch pruning logic

**If both fail:**
- Revert to pre-soak baseline
- Investigate whether Phase 7.17 (adversarial detection) needs tuning
- Schedule deep-dive code review

---

## Monitoring & Alerts

**Grafana dashboards for stress tests:**
1. Load profile (requests/min over time)
2. Latency percentiles (p50, p95, p99)
3. Threshold adaptation (current values + deltas)
4. Confidence score distribution
5. Error rate (false accepts/rejects)

**Alerts:**
- ⚠️ Latency P99 > 10s → check system load
- ⚠️ False reject rate > 15% → check threshold tightness
- ⚠️ Threshold oscillation > ±10% → adaptation loop issue
- 🔴 Process crash → immediate escalation

---

## Data Archival

All stress test data stored in:
```
archive/
├── phase-7-19-stress-results-2026-06-XX.md
├── phase-7-20-stress-results-2026-06-XX.md
├── stress-metrics-prometheus-export.json
└── grafana-stress-dashboard-snapshot.json
```

---

## Success Criteria for Release

✅ Both Phase 7.19 and 7.20 pass  
✅ False reject/accept rates <10% each  
✅ Recovery time <2 hours  
✅ No process crashes under any load profile  
✅ Latency P99 <5 seconds (normal) / <15 seconds (peak)  

**When all criteria met:** Ready for Phase E.2 production deployment

---

**Status:** Scheduled for Week 1 (Jun 10-14)  
**Dependencies:** Phase 7.7 confidence tuning complete  
**Owner:** CIC Stability Team
