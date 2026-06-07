# Idea-to-Roadmap MCP Server

An MCP (Model Context Protocol) server that exposes the Idea-to-Roadmap Pipeline as callable tools inside Claude conversations.

## What It Does

The server implements a complete idea capture → processing → roadmap generation pipeline as described in the System Design Technical Reference Document (v1.0, June 4, 2026). It enables Claude to:

1. **Capture ideas** from any source with automatic deduplication, priority scoring, and tagging
2. **List and retrieve ideas** from the unified inbox with filtering
3. **Run the Idea Harvester Agent (IHA)** to analyze ideas and generate Proposed Roadmap Items (PRIs)
4. **View generated PRIs** with filtering by status, category, and score
5. **Update idea and PRI statuses** for human overrides and governance
6. **Generate daily digests** of high-signal PRIs
7. **Manage IHA configuration** for thresholds, model selection, and behavior

## Getting Started

### Prerequisites
- Node.js v14.17+ (tested on v24.14.1)
- `@anthropic-ai/sdk` v0.100.1 or later (already in monorepo)
- `ANTHROPIC_API_KEY` environment variable set

### Running the Server

From the monorepo root:

```bash
node tools/mcp/idea-inbox-server.js
```

The server reads and writes to `C:\dev\rewrite-mcp\data\idea-inbox/`:
- `inbox.json` — all captured ideas
- `pris.json` — all generated PRIs
- `config.json` — IHA configuration
- `audit.log` — NDJSON audit trail of all decisions

### Registering with Claude

Add this to your Claude Code or Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "idea-inbox": {
      "command": "node",
      "args": ["C:\\dev\\rewrite-mcp\\tools\\mcp\\idea-inbox-server.js"]
    }
  }
}
```

Then restart Claude Code or Claude Desktop to see the tools appear.

## Tools (10 total)

### `idea:capture`
Submit a new idea from any source. Automatically runs:
- Deduplication (marks duplicates; flags near-duplicates)
- Priority signal scoring (0–10 based on source + keywords)
- Auto-tagging (matches controlled vocabulary)

**Input:**
```json
{
  "source": "email|web|chat|notes",
  "captured_by": "user@example.com",
  "raw_content": "Idea text",
  "title": "Brief title (optional)",
  "tags": ["custom-tag"],
  "source_ref": "original-id-or-url",
  "attachments": [{"name": "", "url": "", "type": ""}]
}
```

**Output:**
```json
{
  "idea_id": "uuid",
  "status": "new|duplicate|escalated",
  "message": "Idea captured...",
  "harvest_notes": "Duplicate warning if applicable"
}
```

### `idea:list-inbox`
List ideas in the inbox with optional filters.

**Input:**
```json
{
  "status": "new|processing|harvested|rejected|duplicate|escalated",
  "source": "email|web|chat|notes",
  "tags": ["UX", "performance"],
  "limit": 50
}
```

**Output:** Array of inbox items (up to `limit` results)

### `idea:get-item`
Retrieve a single idea by ID.

**Input:** `{ "idea_id": "uuid" }`

**Output:** Full inbox item

### `idea:harvest`
Run the Idea Harvester Agent on a single idea. Calls Claude API to:
- Enrich the idea (fetch URLs, resolve context)
- Classify (Feature / Bug / Initiative / Spike / Process)
- Score (novelty, strategic alignment, feasibility, source priority)
- Decide (generate PRI, escalate for human review, or reject)

**Input:** `{ "idea_id": "uuid" }`

**Output:**
```json
{
  "idea_id": "uuid",
  "status": "harvested|escalated|rejected",
  "harvest_score": 0-100,
  "confidence": 0.0-1.0,
  "pri_id": "uuid or null",
  "classification": "Feature|Bug|Initiative|Spike|Process"
}
```

**Decision Logic:**
- If `harvest_score >= harvest_threshold` (default 50) → generate PRI, status = `harvested`
- Else if `confidence < escalation_confidence` (default 0.6) → status = `escalated` (human review)
- Else → status = `rejected`

### `idea:harvest-batch`
Run IHA on all `new` ideas up to `batch_size` (default 50).

**Input:** `{ "limit": 50 }`

**Output:**
```json
{
  "processed": 5,
  "results": [
    { "idea_id": "...", "status": "harvested", "harvest_score": 75 },
    ...
  ]
}
```

### `idea:list-pris`
List Proposed Roadmap Items with optional filters.

**Input:**
```json
{
  "status": "proposed|under_review|accepted|deferred|declined",
  "category": "Feature|Bug|Initiative|Spike|Process",
  "min_score": 50,
  "quarter": "Q3 2026",
  "limit": 50
}
```

**Output:** Array of PRIs (up to `limit` results)

### `idea:get-pri`
Retrieve a single PRI by ID.

**Input:** `{ "pri_id": "uuid" }`

**Output:** Full PRI object

### `idea:update-status`
Human override: manually set status on an idea or PRI.

**Input:**
```json
{
  "idea_id": "uuid (if updating idea)",
  "pri_id": "uuid (if updating PRI)",
  "status": "new|processing|harvested|rejected|escalated",
  "reviewed_by": "human@example.com",
  "rationale": "Why this decision"
}
```

**Output:**
```json
{
  "idea_id or pri_id": "uuid",
  "status": "...",
  "message": "Status updated"
}
```

### `idea:daily-digest`
Summarize PRIs created in the last 24 hours. Flags high-signal items (score ≥ 80).

**Input:** `{}`

**Output:**
```json
{
  "period": "Last 24 hours (start to end)",
  "total": 5,
  "high_signal": 2,
  "standard": 3,
  "by_category": {
    "Feature": [...],
    "Initiative": [...]
  },
  "high_signal_pris": [...],
  "all_pris": [...]
}
```

### `idea:config`
Read or update IHA configuration.

**Input (read):** `{}`

**Input (update):** `{ "update": { "harvest_threshold": 45, "model": "claude-opus-4-8" } }`

**Output:** Current config object

**Configurable Fields:**
- `harvest_threshold` (default 50): min harvest score to generate a PRI
- `escalation_confidence` (default 0.6): confidence below which items go to human review
- `dedup_similarity` (default 0.8): threshold for marking duplicates
- `batch_size` (default 50): max ideas per harvest batch
- `max_pris_per_day` (default 100): safety cap on PRI generation
- `model` (default "claude-opus-4-8"): Claude model for IHA
- `reviewer_sla_hours` (default 72): escalated item review deadline
- `stale_pri_days` (default 30): days before PRI marked stale

## Data Models

### Inbox Item Schema
- `idea_id` (UUID): Unique identifier
- `source` (enum): Origin channel (email, web, chat, notes)
- `source_ref` (string): Original reference for deep-linking
- `captured_at` (ISO timestamp): When captured
- `captured_by` (string): User identity
- `title` (string): Brief title
- `raw_content` (string): Full idea text
- `tags` (array): Topic tags (user + auto-detected)
- `attachments` (array): Linked files
- `status` (enum): new, processing, harvested, rejected, duplicate, escalated
- `priority_signal` (0–10): Urgency score
- `harvest_notes` (string): IHA processing details
- `pri_id` (UUID): Link to generated PRI (if any)

### PRI (Proposed Roadmap Item) Schema
- `pri_id` (UUID): Unique identifier
- `idea_id` (UUID): Source idea
- `title` (string): PRI title
- `category` (enum): Feature, Bug, Initiative, Spike, Process
- `description` (string): Summary
- `problem_statement` (string): Pain point addressed
- `proposed_solution` (string): High-level approach
- `strategic_alignment` (array): Aligned OKRs/goals
- `harvest_score` (0–100): Composite IHA score
- `source_attribution` (string): Submitter + source
- `dependencies` (array): Related PRI/roadmap IDs
- `estimated_effort` (enum): XS, S, M, L, XL
- `suggested_quarter` (string): e.g., "Q3 2026"
- `status` (enum): proposed, under_review, accepted, deferred, declined
- `created_at` (ISO timestamp)
- `reviewed_by` (string): Human reviewer identity
- `roadmap_item_id` (string): External roadmap system ID

## Auto-Tagging Vocabulary

The server automatically detects and tags ideas with these keywords:

- UX, performance, AI, security, data, mobile
- cost, compliance, integration, accessibility
- architecture, infrastructure, testing
- documentation, onboarding

Custom tags can be supplied in the `tags` field of `idea:capture`.

## Deduplication

Similarity is computed using Jaccard distance on token sets:
- **Score > 80%** (default `dedup_similarity`): marked `duplicate`, linked to original
- **Score 60–80%**: flagged in `harvest_notes` as possible duplicate
- **Score < 60%**: no action

## IHA Scoring (Harvest Score = 0–100)

The Idea Harvester Agent breaks down the score into four dimensions:

| Dimension | Max | Basis |
|---|---|---|
| Novelty | 40 | Distance from existing roadmap items |
| Strategic alignment | 30 | Match to team OKRs and priorities |
| Feasibility | 15 | Technical signals in content |
| Source priority | 15 | Computed from capture metadata |

**Total = Novelty + Strategic Alignment + Feasibility + Source Priority**

## Audit Log

Every IHA decision is logged to `data/idea-inbox/audit.log` in NDJSON format:

```json
{
  "timestamp": "2026-06-05T...",
  "idea_id": "uuid",
  "action": "harvest|status_update|config_update",
  "harvest_score": 75,
  "confidence": 0.84,
  "decision": "harvested|escalated|rejected",
  "pri_id": "uuid",
  "rejection_reason": "null or reason"
}
```

Logs are retained for 12 months for governance and model improvement.

## Testing

### Unit & Integration Tests

To verify the server works, run:

```bash
node tools/mcp/test-idea-inbox.js
```

This script (9/9 passing):
1. Initializes the server
2. Captures a test idea
3. Lists inbox items
4. Verifies deduplication
5. Reads configuration
6. Reports results

### Smoke Tests

For comprehensive system verification:

```bash
node tools/mcp/idea-inbox.smoke-test.js
```

This script (12/12 passing) validates:
- All 10 tools register and respond correctly
- Idea capture with deduplication
- Inbox querying and filtering
- PRI generation and status updates
- Configuration management
- Data persistence (inbox.json, config.json, audit.log)

## Troubleshooting

**"ENOENT: no such file or directory"**
- Ensure the working directory is `C:\dev\rewrite-mcp` or the server can find `../../data/idea-inbox` relative to `tools/mcp/idea-inbox-server.js`

**"ANTHROPIC_API_KEY not set"**
- Ensure `ANTHROPIC_API_KEY` is in your environment or `.env` file

**IHA tool calls fail**
- Verify the API key is valid and has quota
- Check the model name in config matches a supported Claude model

**Data files not persisting**
- Verify the `data/idea-inbox/` directory is writable
- Check file permissions on the data directory

## Integration with Downstream Systems

The MCP server is the source of truth. When ready, implement bidirectional sync with:

- **Antigravity**: Webhook POST on PRI creation; status callbacks
- **CIC**: Daily digest + REST API + decision callbacks
- **Claude**: Read-only context store (JSON file or vector DB)

See the System Design Technical Reference for full integration details.

## Performance Notes

- **Deduplication**: O(n) per new idea (scans all existing items)
- **IHA processing**: ~2–5 seconds per idea (Claude API call)
- **Batch processing**: 50 ideas/run by default; ~2–4 minutes total
- **Data persistence**: All JSON serialized to disk; no database overhead

## Next Steps

1. Test the server with your own ideas
2. Calibrate IHA thresholds based on observed quality
3. Integrate with Antigravity roadmap system
4. Add email/Teams/Slack capture integrations
5. Set up CIC dashboard sync

## Author

Chris Sorensen — June 5, 2026
