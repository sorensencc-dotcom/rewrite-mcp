# Idea-to-Roadmap MCP Server — Quick Examples

Copy & paste these examples into Claude conversations (after registering the MCP server).

## Example 1: Capture an Idea

```
Tool: idea:capture
Arguments:
- source: web
- captured_by: chris@example.com
- title: Improve API Performance
- raw_content: We should add caching to the user API endpoint to reduce latency. Current response time is 2s, target is <500ms. Could use Redis or an in-memory cache.
- tags: ["performance", "backend"]
```

**Response:**
```json
{
  "idea_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "new",
  "message": "Idea captured (new)",
  "harvest_notes": ""
}
```

---

## Example 2: List New Ideas Waiting for Harvest

```
Tool: idea:list-inbox
Arguments:
- status: new
- limit: 50
```

**Response:**
```json
[
  {
    "idea_id": "550e8400-e29b-41d4-a716-446655440000",
    "source": "web",
    "captured_by": "chris@example.com",
    "title": "Improve API Performance",
    "raw_content": "We should add caching...",
    "tags": ["performance", "backend"],
    "status": "new",
    "priority_signal": 4,
    "harvest_notes": ""
  },
  ...
]
```

---

## Example 3: Get a Specific Idea

```
Tool: idea:get-item
Arguments:
- idea_id: 550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "idea_id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "web",
  "source_ref": "https://example.com/perf-article",
  "captured_at": "2026-06-05T03:15:22.123Z",
  "captured_by": "chris@example.com",
  "title": "Improve API Performance",
  "raw_content": "We should add caching to the user API endpoint...",
  "tags": ["performance", "backend", "cache"],
  "attachments": [],
  "status": "new",
  "priority_signal": 4,
  "harvest_notes": "",
  "pri_id": null
}
```

---

## Example 4: Run IHA on One Idea

```
Tool: idea:harvest
Arguments:
- idea_id: 550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "idea_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "harvested",
  "harvest_score": 72,
  "confidence": 0.82,
  "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "classification": "Initiative"
}
```

**What happened:**
- IHA analyzed the idea
- Classified it as an "Initiative" (cross-cutting effort)
- Scored it 72/100 (above the 50-point threshold)
- Generated a PRI (Proposed Roadmap Item)
- Updated the inbox item status from "new" to "harvested"

---

## Example 5: Process All New Ideas (Batch)

```
Tool: idea:harvest-batch
Arguments:
- limit: 50
```

**Response:**
```json
{
  "processed": 5,
  "results": [
    {
      "idea_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "harvested",
      "harvest_score": 72,
      "classification": "Initiative",
      "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    },
    {
      "idea_id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "rejected",
      "harvest_score": 32,
      "classification": "Feature"
    },
    {
      "idea_id": "550e8400-e29b-41d4-a716-446655440002",
      "status": "escalated",
      "harvest_score": 48,
      "confidence": 0.58,
      "classification": "Spike"
    },
    ...
  ]
}
```

**Interpretation:**
- 5 ideas processed
- 3 became PRIs (harvested)
- 1 was rejected (score too low)
- 1 escalated for human review (confidence too low)

---

## Example 6: View All Generated PRIs

```
Tool: idea:list-pris
Arguments:
- status: proposed
- limit: 100
```

**Response:**
```json
[
  {
    "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "idea_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Add Caching Layer to User API for 500ms Latency Target",
    "category": "Initiative",
    "description": "Implement Redis-backed caching on the user API endpoint...",
    "problem_statement": "Current API latency is 2s; target is <500ms to improve UX",
    "proposed_solution": "Add Redis cache for user profile queries with 5-min TTL",
    "strategic_alignment": ["Performance", "Platform Reliability"],
    "harvest_score": 72,
    "source_attribution": "chris@example.com via web",
    "estimated_effort": "M",
    "suggested_quarter": "Q3 2026",
    "status": "proposed",
    "created_at": "2026-06-05T03:20:15.456Z",
    "reviewed_by": null,
    "roadmap_item_id": null
  },
  ...
]
```

---

## Example 7: Get High-Signal PRIs

```
Tool: idea:list-pris
Arguments:
- min_score: 80
- limit: 50
```

**Response:**
```json
[
  {
    "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c9",
    "title": "AI-Powered Workflow Automation",
    "harvest_score": 85,
    "category": "Initiative",
    "status": "proposed",
    ...
  },
  {
    "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430ca",
    "title": "Real-Time Collaboration Features",
    "harvest_score": 82,
    "category": "Feature",
    "status": "proposed",
    ...
  }
]
```

---

## Example 8: Check Today's Summary

```
Tool: idea:daily-digest
Arguments:
{}
```

**Response:**
```json
{
  "period": "Last 24 hours (2026-06-04T03:30:00Z to 2026-06-05T03:30:00Z)",
  "total": 8,
  "high_signal": 2,
  "standard": 6,
  "by_category": {
    "Feature": [
      {
        "pri_id": "...",
        "title": "Real-Time Notifications",
        "harvest_score": 68,
        "status": "proposed"
      }
    ],
    "Initiative": [
      {
        "pri_id": "...",
        "title": "Platform Scalability",
        "harvest_score": 85,
        "status": "proposed"
      }
    ],
    "Spike": [...]
  },
  "high_signal_pris": [
    {
      "pri_id": "...",
      "title": "Platform Scalability",
      "harvest_score": 85
    },
    {
      "pri_id": "...",
      "title": "AI Orchestration Patterns",
      "harvest_score": 82
    }
  ]
}
```

---

## Example 9: Mark an Idea for Review

```
Tool: idea:update-status
Arguments:
- idea_id: 550e8400-e29b-41d4-a716-446655440001
- status: processing
- reviewed_by: alice@example.com
- rationale: Flagged for deeper review; needs stakeholder input
```

**Response:**
```json
{
  "idea_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "processing",
  "message": "Inbox item status updated"
}
```

---

## Example 10: Accept a PRI

```
Tool: idea:update-status
Arguments:
- pri_id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
- status: accepted
- reviewed_by: bob@example.com
- rationale: Aligns with H2 performance roadmap; assigned to Sarah
```

**Response:**
```json
{
  "pri_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "status": "accepted",
  "message": "PRI status updated"
}
```

---

## Example 11: View IHA Configuration

```
Tool: idea:config
Arguments:
{}
```

**Response:**
```json
{
  "harvest_threshold": 50,
  "escalation_confidence": 0.6,
  "dedup_similarity": 0.8,
  "batch_size": 50,
  "max_pris_per_day": 100,
  "model": "claude-opus-4-8",
  "reviewer_sla_hours": 72,
  "stale_pri_days": 30
}
```

---

## Example 12: Tune IHA Thresholds

```
Tool: idea:config
Arguments:
- update:
    harvest_threshold: 45
    escalation_confidence: 0.65
```

**Response:**
```json
{
  "message": "Config updated",
  "config": {
    "harvest_threshold": 45,
    "escalation_confidence": 0.65,
    "dedup_similarity": 0.8,
    "batch_size": 50,
    "max_pris_per_day": 100,
    "model": "claude-opus-4-8",
    "reviewer_sla_hours": 72,
    "stale_pri_days": 30
  }
}
```

**Effect:** Next batch will generate PRIs at 45+ (instead of 50+), and will escalate items with confidence 0.65–0.60 (wider escalation net).

---

## Workflow: From Idea to Roadmap

1. **Capture:** Idea comes in from Slack/email/browser
   ```
   idea:capture(source: "chat", captured_by: "user@...", raw_content: "...")
   ```

2. **Harvest:** Run IHA on the captured idea
   ```
   idea:harvest(idea_id: "...")
   ```

3. **Review:** Check the generated PRI
   ```
   idea:get-pri(pri_id: "...")
   ```

4. **Decide:** Accept, defer, or decline
   ```
   idea:update-status(pri_id: "...", status: "accepted", reviewed_by: "manager@...", rationale: "...")
   ```

5. **Summarize:** Check daily digest for high-signal items
   ```
   idea:daily-digest()
   ```

---

## Tips

- **Auto-tagging:** Ideas are automatically tagged with UX, performance, AI, security, data, mobile, cost, compliance, integration, accessibility, architecture, infrastructure, testing, documentation, onboarding
- **Deduplication:** If an idea is 80%+ similar to an existing one, it's marked `duplicate` automatically
- **Escalation:** If IHA is uncertain (confidence < 0.6), it escalates to human review instead of auto-rejecting
- **Batch processing:** Run `idea:harvest-batch()` daily or weekly to keep the pipeline flowing
- **Audit trail:** Every decision is logged to `data/idea-inbox/audit.log`

---

For more details, see `README-idea-inbox.md`.
