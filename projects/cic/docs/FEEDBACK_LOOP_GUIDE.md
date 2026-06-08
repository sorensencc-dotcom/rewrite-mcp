# CodeBurn Feedback Loop — Operator Guide

## Overview

The CodeBurn Feedback Loop is a **fully automated cost optimization system** that:

1. **Captures** LLM telemetry from all CIC pipelines (INGEST, REDESIGN, OUTREACH, ANALYSIS)
2. **Analyzes** historical cost and reliability data via CodeBurn
3. **Recommends** routing rule updates based on model performance
4. **Updates** TokenEconomyAgent routing rules automatically (operator-gated)
5. **Runs hourly** via cron scheduler with full observability

**Timeline:** Runs every hour at the top of the hour (configurable)  
**Success Metric:** ≥40% token cost reduction per successful redesign

---

## Architecture

```
CIC Pipelines (INGEST, REDESIGN, OUTREACH)
    ↓
Telemetry Emitters → ~/.cic/logs/telemetry/ (JSONL, 90-day retention)
    ↓
CodeBurn Provider Plugin → Aggregates by model/stage/agent
    ↓
CodeBurn Export (~/.codeburn/exports/cic_telemetry.json)
    ↓
Feedback Loop (hourly) → Generates recommendations
    ↓
Routing Rules (config/token-economy/routing_rules.json)
    ↓
TokenEconomyAgent → Uses updated rules for next round of routing
```

---

## Quick Start

### 1. Enable the Scheduler

The feedback loop scheduler starts automatically when the CIC server starts. To verify:

```bash
# Check scheduler status via API
curl http://localhost:3000/api/feedback-loop/status

# Response
{
  "enabled": true,
  "isRunning": true,
  "totalRuns": 5,
  "activeRuns": 0,
  "lastRunTime": "2026-06-07T19:00:00Z",
  "lastRunStatus": "success",
  "lastRunError": null
}
```

### 2. Monitor Telemetry Collection

Check that telemetry is being collected:

```bash
# View recent LLM call events
tail -20 ~/.cic/logs/telemetry/llm_calls.jsonl

# Count events by model
jq -r '.model' ~/.cic/logs/telemetry/llm_calls.jsonl | sort | uniq -c
```

### 3. Review Recommendations

After the feedback loop runs, check recommendations:

```bash
# View latest recommendations
cat config/token-economy/routing_recommendations.json

# Example recommendation
{
  "stage": "REDESIGN",
  "current_model": "claude-3.7-opus",
  "recommended_model": "claude-3.7-sonnet",
  "reason": "Cost optimization: 66.7% cheaper",
  "estimated_savings_usd": 12.50,
  "confidence": 0.95
}
```

### 4. Verify Updated Rules

Rules are updated hourly if confidence ≥ 85%:

```bash
# View current routing rules
cat config/token-economy/routing_rules.json

# Check update timestamp
jq '.updated_at' config/token-economy/routing_rules.json
```

---

## Configuration

### Environment Variables

```bash
# Enable/disable scheduler
export FEEDBACK_LOOP_ENABLED=true

# Cron expression (default: "0 * * * *" = top of every hour)
export FEEDBACK_LOOP_CRON="0 * * * *"

# Log level: debug, info, warn, error
export FEEDBACK_LOOP_LOG_LEVEL=info

# Run cycle on scheduler startup
export FEEDBACK_LOOP_RUN_ON_STARTUP=false

# Telemetry directories
export CIC_TELEMETRY_DIR=~/.cic/logs/telemetry
export REWRITE_LABS_TELEMETRY_DIR=~/.rewrite-labs/logs/telemetry

# CodeBurn export location
export CODEBURN_EXPORT_PATH=~/.codeburn/exports/cic_telemetry.json

# Routing rules location
export ROUTING_RULES_PATH=config/token-economy/routing_rules.json
```

### Cron Expressions

```bash
# Every hour (top of the hour)
"0 * * * *"

# Every 30 minutes
"*/30 * * * *"

# 2 AM UTC every day
"0 2 * * *"

# Every Monday at 9 AM
"0 9 * * 1"

# Every 4 hours
"0 */4 * * *"
```

---

## Telemetry Events

### LLM Call Event

```json
{
  "type": "llm_call",
  "timestamp": "2026-06-07T19:30:00Z",
  "agent": "harvester",
  "model": "claude-3.7-sonnet",
  "provider": "anthropic",
  "input_tokens": 5000,
  "output_tokens": 2500,
  "cache_read_tokens": 0,
  "cache_write_tokens": 1000,
  "latency_ms": 3200,
  "retry_count": 0,
  "task_type": "extraction",
  "pipeline_stage": "INGEST",
  "project": "family-history",
  "session_id": "sess_abc123",
  "correlation_id": "corr_xyz789"
}
```

### Routing Decision Event

```json
{
  "type": "routing_decision",
  "timestamp": "2026-06-07T19:30:00Z",
  "agent": "harvester",
  "requested_model": "claude-3.7-opus",
  "selected_model": "claude-3.7-sonnet",
  "reason": "cost_optimization",
  "budget_class": "standard",
  "max_tokens": 8192,
  "correlation_id": "corr_xyz789"
}
```

### Cost Event

```json
{
  "type": "cost_event",
  "timestamp": "2026-06-07T19:30:00Z",
  "model": "claude-3.7-sonnet",
  "provider": "anthropic",
  "input_tokens": 5000,
  "output_tokens": 2500,
  "cache_read_tokens": 0,
  "cache_write_tokens": 1000,
  "total_cost_usd": 0.047,
  "pipeline_stage": "INGEST",
  "project": "family-history",
  "agent": "harvester",
  "session_id": "sess_abc123"
}
```

---

## Routing Rules

### Rule Structure

```json
{
  "id": "harvester-ingest-standard",
  "description": "Harvester runs at INGEST stage — balanced cost/quality",
  "match": {
    "pipeline_stage": "INGEST",
    "agent": ".*harvester.*"
  },
  "action": {
    "model": "claude-3.7-sonnet",
    "max_tokens": 8192,
    "budget_class": "standard",
    "priority": "normal"
  },
  "created_at": "2026-06-07",
  "updated_at": "2026-06-07",
  "source": "codeburn-integration"
}
```

### Default Rules

| Stage | Model | Max Tokens | Budget | Use Case |
|-------|-------|-----------|--------|----------|
| INGEST | Sonnet | 8K | Standard | Fast, reliable extraction |
| REDESIGN | Opus | 16K | Premium | High-quality redesigns |
| OUTREACH | Haiku | 2K | Economy | High-volume, low-cost outreach |
| ANALYSIS | Sonnet | 12K | Standard | Balanced analysis |
| Fallback | Sonnet | 4K | Standard | Default for unmapped calls |

### Constraints

```json
{
  "max_daily_tokens": 10000000,
  "max_daily_cost_usd": 500,
  "max_request_tokens": 32000,
  "min_success_rate_threshold": 0.95,
  "max_retry_rate_threshold": 0.25
}
```

---

## Recommendations Engine

### How Recommendations Are Generated

1. **Load CodeBurn statistics** (cost, success rate, retry rate per model/stage)
2. **Group by pipeline stage** (INGEST, REDESIGN, OUTREACH, ANALYSIS)
3. **Find cost optimizations:**
   - If cheaper model has ≥95% success rate and is ≥20% cheaper → recommend switch
4. **Find reliability improvements:**
   - If retry rate >20% → recommend more reliable model
5. **Score confidence:**
   - Cost optimization: 0.95 (high confidence)
   - Reliability: 0.85 (moderate confidence)

### Example Recommendation Flow

**Input:**
```json
{
  "stage": "OUTREACH",
  "models": [
    { "model": "haiku", "cost": 0.01, "success_rate": 0.85, "retries": 0.25 },
    { "model": "sonnet", "cost": 0.04, "success_rate": 0.96, "retries": 0.06 }
  ]
}
```

**Output:**
```json
{
  "stage": "OUTREACH",
  "current_model": "haiku",
  "recommended_model": "sonnet",
  "reason": "Reliability improvement: 96% success vs 85%",
  "confidence": 0.85
}
```

---

## Monitoring & Debugging

### Check Scheduler Health

```bash
# View scheduler status
curl http://localhost:3000/api/feedback-loop/status

# Manually trigger a cycle (for testing)
curl -X POST http://localhost:3000/api/feedback-loop/run-now
```

### View Logs

```bash
# View scheduler logs (filter for feedback loop)
tail -f /var/log/cic/feedback-loop.log | grep -E "Cycle|ERROR"

# View with timestamps
tail -f /var/log/cic/feedback-loop.log | grep "\[Cycle"
```

### Analyze Telemetry

```bash
# Count events by stage
jq -r '.pipeline_stage' ~/.cic/logs/telemetry/llm_calls.jsonl | sort | uniq -c

# Count events by model
jq -r '.model' ~/.cic/logs/telemetry/llm_calls.jsonl | sort | uniq -c

# Calculate average cost by model
jq -s 'group_by(.model) | map({model: .[0].model, avg_cost: (map(.total_cost_usd) | add / length)})' \
  ~/.cic/logs/telemetry/cost_events.jsonl
```

### Debug Failed Cycles

```bash
# Check for errors
grep "ERROR" /var/log/cic/feedback-loop.log | tail -20

# Check if CodeBurn export exists
ls -lh ~/.codeburn/exports/cic_telemetry.json

# Verify routing rules are valid JSON
jq . config/token-economy/routing_rules.json
```

---

## Testing

### Run Integration Tests

```bash
# Test feedback loop
npm run test:feedback-loop

# Test scheduler
npm run test:scheduler

# Run all integration tests
npm run test:integration
```

### Manual Testing

```bash
# Create mock CodeBurn export
cat > ~/.codeburn/exports/cic_telemetry.json << 'EOF'
{
  "stats": [
    {
      "model": "claude-3.7-sonnet",
      "avg_cost_usd": 0.03,
      "avg_retry_rate": 0.06,
      "pipeline_stage": "INGEST",
      "usage_count": 100,
      "success_rate": 0.97
    }
  ]
}
EOF

# Run feedback loop manually
npm run feedback-loop:run-now
```

---

## Troubleshooting

### Scheduler Not Running

**Symptom:** `getStatus()` shows `isRunning: false`

**Solution:**
```bash
# Check if enabled
echo $FEEDBACK_LOOP_ENABLED

# Check logs for startup errors
tail -50 /var/log/cic/feedback-loop.log | grep ERROR

# Try restarting
systemctl restart cic
```

### No Telemetry Collected

**Symptom:** `~/.cic/logs/telemetry/llm_calls.jsonl` is empty

**Solution:**
```bash
# Check if pipelines are running
ps aux | grep "harvester\|redesign\|outreach"

# Verify telemetry directory is writable
touch ~/.cic/logs/telemetry/test.txt
rm ~/.cic/logs/telemetry/test.txt

# Check permissions
ls -la ~/.cic/logs/telemetry/
```

### Recommendations Not Generated

**Symptom:** `routing_recommendations.json` is empty

**Solution:**
```bash
# Check if CodeBurn export exists
ls -lh ~/.codeburn/exports/cic_telemetry.json

# Verify export has data
jq '.stats | length' ~/.codeburn/exports/cic_telemetry.json

# Check for errors in feedback loop logs
grep "recommendations" /var/log/cic/feedback-loop.log
```

### Rules Not Updating

**Symptom:** Routing rules are stale (old `updated_at`)

**Solution:**
```bash
# Check rule constraints
jq '.constraints' config/token-economy/routing_rules.json

# Verify recommendations have high confidence (≥0.85)
jq '.[] | select(.confidence < 0.85)' config/token-economy/routing_recommendations.json

# Check scheduler is running
curl http://localhost:3000/api/feedback-loop/status
```

---

## Performance Tuning

### Optimize Cron Schedule

Default: every hour (top of the hour)

**For lower cost environments:**
```bash
# Run 4 times per day
export FEEDBACK_LOOP_CRON="0 0,6,12,18 * * *"
```

**For high-frequency optimization:**
```bash
# Run every 30 minutes
export FEEDBACK_LOOP_CRON="*/30 * * * *"
```

### Tune Confidence Thresholds

In `src/token-economy/feedback_loop.ts`:

```typescript
// Update confidence thresholds
const highConfidence = 0.95; // Cost optimization
const moderateConfidence = 0.85; // Reliability
```

### Archive Old Telemetry

Telemetry is retained for 90 days. To archive:

```bash
# Archive telemetry older than 90 days
find ~/.cic/logs/telemetry -type f -mtime +90 -exec gzip {} \;
```

---

## Success Metrics (2026-06-14 Target)

- ✅ **≥40% token cost reduction** per successful redesign
- ✅ **≥25% retry rate reduction** on Harvester + Redesign agents
- ✅ **100% pipeline visibility** in CodeBurn dashboards
- ✅ **≥85% recommendation confidence** on auto-updates
- ✅ **<5 second execution time** per feedback loop cycle

---

## Support & Escalation

For issues:

1. **Check scheduler status** — `curl http://localhost:3000/api/feedback-loop/status`
2. **Review logs** — `tail -100 /var/log/cic/feedback-loop.log`
3. **Verify telemetry** — `ls -lh ~/.cic/logs/telemetry/`
4. **Run integration tests** — `npm run test:feedback-loop`

Escalate to engineering if:
- Scheduler crashes repeatedly
- Telemetry collection stops
- Recommendations are inconsistent
