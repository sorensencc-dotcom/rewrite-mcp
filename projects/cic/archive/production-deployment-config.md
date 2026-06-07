# Production Deployment — Alert Channels & Configuration
**Status:** Ready for Implementation  
**Target:** Phase E.2 Production Release

---

## Deployment Architecture

```
Production Environment (Linux/Docker)
├── CIC Ingestion Service (3 replicas)
│   ├── Stability Soak Runner (systemd unit)
│   └── Health Endpoint (/health/stability)
├── Prometheus (metrics collection)
├── Grafana (dashboards + alerts)
├── AlertManager (notification routing)
└── Notification Channels
    ├── Slack (ops-cic channel)
    ├── PagerDuty (on-call escalation)
    ├── Email (CIC team)
    └── OpsGenie (incident tracking)
```

---

## Alert Notification Channels

### Channel 1: Slack (Real-Time Ops Notifications)

**Configuration:**

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'slack-cic-ops'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h

receivers:
  - name: 'slack-cic-ops'
    slack_configs:
      - channel: '#ops-cic-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Phase:* 7.15-7.20 (ARL Stability)
          *Severity:* {{ .GroupLabels.severity }}
          *Timestamp:* {{ .GroupLabels.timestamp }}
          
          Details:
          {{ range .Alerts }}
          • {{ .Labels.instance }}: {{ .Annotations.description }}
          {{ end }}
        send_resolved: true
        actions:
          - type: button
            text: 'View Grafana'
            url: 'http://grafana.prod/d/arl-v2-dash'
          - type: button
            text: 'Restart Soak'
            url: 'https://ops.internal/cic/restart-soak'
```

**Who Gets Notified:**
- @ops-cic-on-call (all alerts)
- @cic-team (daily summary)

**Alert Tags:**
```
[🔴 CRITICAL] — Metric stall, process down
[🟠 WARNING]  — Adversarial rate anomaly, threshold drift
[🟡 INFO]     — Routine metrics update, recovery complete
```

---

### Channel 2: PagerDuty (On-Call Escalation)

**Configuration:**

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}'
        details:
          firing: '{{ range .Alerts.Firing }}{{ .Labels.instance }} {{ end }}'
          severity: '{{ .GroupLabels.severity }}'
        client: 'CIC Alerting'
        client_url: 'http://grafana.prod/d/arl-v2-dash'

# Alert routing for critical issues
route:
  receiver: 'pagerduty-critical'
  match:
    severity: 'critical'
  continue: true
  repeat_interval: 1h
```

**Escalation Policy:**
```
Level 1 (5 min): Page on-call engineer
Level 2 (15 min): Page engineering lead
Level 3 (30 min): Page director of R&D
```

**Critical Alerts Triggering PagerDuty:**
- 🔴 CIC Stability — Drift Metric Stalled (>5 min)
- 🔴 CIC Stability — Contradiction Metric Stalled (>5 min)
- 🔴 CIC Stability — Stability Score Not Updating (>5 min)
- 🔴 CIC Stability — Process Not Running (>2 min)

---

### Channel 3: Email (Daily Digest & Critical)

**Configuration:**

```yaml
receivers:
  - name: 'email-cic-team'
    email_configs:
      - to: 'cic-team@company.com'
        from: 'alerts@cic.company.com'
        smarthost: 'smtp.company.com:587'
        auth_username: 'alerts@company.com'
        auth_password: '${SMTP_PASSWORD}'
        headers:
          Subject: '[CIC Stability] {{ .GroupLabels.alertname }}'
        html: |
          <h2>{{ .GroupLabels.alertname }}</h2>
          <p><strong>Severity:</strong> {{ .GroupLabels.severity }}</p>
          <p><strong>Time:</strong> {{ .GroupLabels.timestamp }}</p>
          <h3>Details:</h3>
          {{ range .Alerts }}
          <ul>
            <li>{{ .Labels.instance }}: {{ .Annotations.description }}</li>
            <li>Value: {{ .Labels.value }}</li>
          </ul>
          {{ end }}
          <p><a href="http://grafana.prod/d/arl-v2-dash">View Dashboard</a></p>

route:
  receiver: 'email-cic-team'
  match:
    severity: 'critical'
  repeat_interval: 24h  # Daily digest
```

**Email Recipients:**
- cic-team@company.com (all critical)
- cic-director@company.com (critical + escalations)

---

### Channel 4: OpsGenie (Incident Tracking)

**Configuration:**

```yaml
receivers:
  - name: 'opsgenie-incidents'
    opsgenie_configs:
      - api_key: '${OPSGENIE_API_KEY}'
        api_url: 'https://api.opsgenie.com/'
        description: '{{ .GroupLabels.alertname }} on {{ .GroupLabels.instance }}'
        details:
          severity: '{{ .GroupLabels.severity }}'
          phase: '7.15-7.20'
          environment: 'production'
          action: |
            {{ if eq .GroupLabels.alertname "DriftMetricStalled" }}
            1. Check Grafana dashboard for stall time
            2. Run: ./scripts/restart-stability-soak.ps1
            3. Verify metrics resume within 2 min
            {{ end }}
        tags:
          - 'cic-stability'
          - 'arl'
          - '{{ .GroupLabels.severity }}'
        priority: '{{ if eq .GroupLabels.severity "critical" }}P1{{ else }}P2{{ end }}'
        responders:
          - type: 'team'
            name: 'CIC Engineering'

route:
  receiver: 'opsgenie-incidents'
  group_by: ['alertname']
  group_wait: 30s
  repeat_interval: 2h
```

**Incident Auto-Creation:**
- All CRITICAL alerts → P1 incident
- All WARNING alerts → P2 incident
- Auto-assigned to CIC Engineering team

---

## Alert Rules (Production)

**File:** `provisioning/alerts/cic-stability-production.yml`

```yaml
groups:
  - name: cic-stability-critical
    interval: 30s
    rules:
      - alert: DriftMetricStalled
        expr: increase(cic_stability_drift_avg[5m]) < 0.001
        for: 5m
        labels:
          severity: critical
          phase: 7.15-7.20
        annotations:
          summary: "CIC Stability — Drift Avg metric stalled"
          description: "Drift metric has not changed in 5 minutes. Process likely crashed."
          runbook: "https://wiki.internal/cic/runbook#drift-stall"

      - alert: ContradictionMetricStalled
        expr: increase(cic_stability_contradiction_avg[5m]) < 0.001
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CIC Stability — Contradiction metric stalled"
          description: "Contradiction metric not updating. Check process health."

      - alert: StabilityScoreNotUpdating
        expr: abs(delta(cic_stability_score[5m])) < 0.001
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CIC Stability — Stability score frozen"
          description: "Score unchanged for 5+ minutes. Metric collection may be stuck."

      - alert: AdversarialRateAnomalous
        expr: increase(cic_stability_adversarial_rate[5m]) > 50000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CIC Stability — Adversarial rate spike"
          description: "Rate climbing faster than expected. Check for recursive attacks."

      - alert: StabilityProcessDown
        expr: up{job="cic-stability"} < 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CIC Stability — Process not responding"
          description: "Process down for >2 minutes. May have OOM-killed or crashed."
          remediation: "Run: ./scripts/restart-stability-soak.ps1 -Duration 12h"

  - name: cic-stability-warnings
    interval: 30s
    rules:
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes{job="cic-stability"} > 1.8e9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CIC Stability — High memory usage"
          description: "Process using >1.8GB. May trigger OOM kill soon."

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(arl_expansion_latency_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CIC Stability — Expansion latency high"
          description: "P99 latency >10s. System under stress."

      - alert: ThresholdDrift
        expr: abs(rate(arl_threshold_adaptations[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CIC Stability — Threshold oscillating"
          description: "Thresholds adapting frequently. May indicate unstable load."
```

---

## Runbook Templates

Each alert includes auto-generated remediation steps in OpsGenie:

### DriftMetricStalled Runbook
```markdown
## Symptoms
- Grafana shows flat Drift Avg line for >5 min
- PagerDuty alert firing
- /health/stability shows secondsSinceLastUpdate > 300

## Diagnosis
1. Check if process is running:
   ps aux | grep orchestrate
2. Check logs:
   journalctl -u cic-stability -n 50
3. Check memory:
   free -h (should not be 100%)

## Resolution (Quick)
1. Restart immediately:
   ./scripts/restart-stability-soak.ps1 -Duration 12h
2. Verify metrics resume:
   curl http://localhost:3000/health/stability
3. Should see secondsSinceLastUpdate < 10

## Resolution (Deep)
If restart doesn't fix:
1. Check PM2 logs: pm2 logs cic-stability-orchestrate
2. Check Prometheus scrape: curl prometheus:9090/api/v1/query?query=up
3. Check network: ping prometheus grafana
4. Escalate to engineering
```

---

## Production Deployment Checklist

**Week 1: Pre-Deployment**
- [ ] Test all 4 alert channels (Slack, PagerDuty, Email, OpsGenie)
- [ ] Configure AlertManager in production environment
- [ ] Migrate Grafana dashboards to prod Grafana instance
- [ ] Set up systemd units on 3 prod machines
- [ ] Stage Prometheus scrape config

**Week 2: Deployment**
- [ ] Deploy systemd service to machine 1 (canary)
- [ ] Monitor for 24 hours (no alerts should fire)
- [ ] Deploy to machines 2 & 3 (rolling)
- [ ] Verify 3-replica load balancing working
- [ ] Enable all alert rules

**Week 3: Validation**
- [ ] Trigger each alert type manually (test channels)
- [ ] Verify PagerDuty escalation works
- [ ] Verify Slack notifications formatted correctly
- [ ] Run 48-hour stability test under production load
- [ ] Review and tune alert thresholds if needed

**Week 4: Live**
- [ ] Enable critical alert routing to on-call
- [ ] Document escalation procedures
- [ ] Train ops team on dashboards & runbooks
- [ ] Schedule monthly review meeting

---

## Configuration Files Needed

```
production/
├── alertmanager.yml              [Alert routing]
├── prometheus-prod.yml           [Scrape config]
├── grafana-datasource-prod.yml   [Prometheus DS]
├── cic-stability.service         [systemd unit]
├── provisioning/
│   └── alerts/
│       └── cic-stability-prod.yml [Alert rules]
├── runbooks/
│   ├── drift-stall-runbook.md
│   ├── contradiction-stall-runbook.md
│   ├── process-down-runbook.md
│   └── adversarial-spike-runbook.md
└── terraform/
    └── cic-stability-prod.tf     [IaC]
```

---

## Support & Escalation

**On-Call Duty:** ops-cic-on-call (rotates weekly)  
**Escalation:** cic-team-lead → cic-director  
**War Room:** #ops-incident-war-room (Slack)  
**RCA Template:** https://wiki.internal/incident-rca

---

**Status:** Ready for deployment  
**Target Date:** 2026-06-17 (Week 2)  
**Owner:** CIC Operations & Engineering
