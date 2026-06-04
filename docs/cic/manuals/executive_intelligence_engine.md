# Operator Manual: Executive Intelligence Engine

The Executive Intelligence Engine (EIE) is an MCP server that automates Gmail triage and local file staging for the CIC and Rewrite Labs pipelines. It runs as a Claude Desktop tool, authenticates via Google OAuth2, and exposes three callable tools over stdio.

## 1. Purpose

EIE replaces manual inbox review with a two-pass automated loop: classify and label every unread message, then immediately stage any project-relevant attachments to the local filesystem — all triggered from a single tool call or a scheduled Claude Desktop task.

## 2. Location

```
projects/cic/ingestion/mcp-servers/executive-intelligence-engine/
├── src/server.js       # Entry point — all classes and MCP handlers
├── config/
│   ├── credentials.json   # Google OAuth2 client credentials (not committed)
│   ├── token.json         # Stored refresh/access token (not committed)
│   └── triage_rules.json  # Learned sender-to-label rules (auto-managed)
├── logs/
│   └── audit.log          # Append-only JSONL audit trail
└── package.json
```

Attachment staging output (relative to ingestion root):

```
data/staged/
├── cic/            # Attachments from Projects/Cast Iron Charlie emails
└── rewritelabs/    # Attachments from Business/Rewrite Labs emails
```

## 3. MCP Tools

### `execute_24h_triage_scan`

Scans unread Gmail from the past 24 hours. Runs in two sequential passes.

**Pass 1 — Classification & Labeling.** Each message is categorized by the `TriageRuleEngine` and labeled in Gmail. Categorization priority: exact sender match → domain match → keyword regex → default `@Pending`.

**Pass 2 — Inline Attachment Staging.** Any message assigned a project label (`Projects/Cast Iron Charlie` or `Business/Rewrite Labs`) is immediately passed to the attachment staging engine via the `messageTargets` fast-path. Skipped if no project messages were found.

Input: none.

Output:

```json
{
  "messageCount": 42,
  "labelsApplied": 42,
  "staging": {
    "staged": [...],
    "skipped": [...],
    "errors": [...],
    "summary": "Staged 3 file(s). Skipped 1. Errors: 0."
  },
  "result": "Processed 42 messages. Applied 42 labels. Staged 3 attachment(s)."
}
```

---

### `stage_email_attachments`

Standalone attachment staging tool. Scans Gmail by label, downloads attachments, and writes them to the local staging directory. Idempotent — files already on disk are skipped.

Input (all optional):

```json
{ "labels": ["Projects/Cast Iron Charlie"] }
```

When called internally with `messageTargets`, skips the label query and processes only the specified message IDs directly.

**Staging path assignment:**

| Gmail Label | Staging Directory |
|---|---|
| `Projects/Cast Iron Charlie` | `data/staged/cic/` |
| `Business/Rewrite Labs` | `data/staged/rewritelabs/` |

**Filename format:** `{YYYY-MM-DD}_{msgId[-6:]}_{sanitized_original_filename}`

Example: `2026-06-03_b51f32_exhibit_A.pdf`

Output:

```json
{
  "staged": [{ "label": "...", "filename": "...", "subject": "...", "destPath": "...", "sizeBytes": 204800 }],
  "skipped": [{ "label": "...", "filename": "...", "reason": "already exists" }],
  "errors": [],
  "summary": "Staged 2 file(s). Skipped 1. Errors: 0."
}
```

---

### `commit_triage_action`

Manually applies a pipeline label to a specific message. Optionally learns the sender-to-label mapping for future auto-categorization.

Input:

```json
{
  "messageId": "19e8b94dd29704ee",
  "targetLabel": "@Action Required",
  "learnSender": true
}
```

Valid labels: `@Action Required`, `@Pending`, `@Review`, `Business/Rewrite Labs`, `Projects/Cast Iron Charlie`, `Administrative`, `Archived`.

Output:

```json
{
  "success": true,
  "message": "Applied label \"@Action Required\" to message 19e8b94dd29704ee and learned sender rule."
}
```

## 4. Triage Rule Engine

Rules are stored in `config/triage_rules.json` and auto-managed at runtime. Keys are sender emails, domains (`@domain.com`), or subject keywords. Values are pipeline label names.

```json
{
  "noreply@robinhood.com": "@Action Required",
  "@linkedin.com": "@Pending",
  "sorensen": "Projects/Cast Iron Charlie"
}
```

Rules are added via `commit_triage_action` with `learnSender: true`. No manual editing required.

## 5. Authentication

EIE uses Google OAuth2 with a locally stored refresh token. On startup it loads `config/credentials.json` (standard installed-app format from Google Cloud Console) and `config/token.json`. The `TokenManager` auto-refreshes the access token if within 5 minutes of expiry and persists updated credentials to disk.

Neither file is committed. If `token.json` is absent, the server throws on initialization and requires a fresh auth flow.

## 6. Audit Log

Every event is appended to `logs/audit.log` as a JSONL record:

```json
{
  "timestamp": "2026-06-03T20:35:00.000Z",
  "eventType": "attachment_staged",
  "source": "_stageMessageAttachments",
  "label": "Projects/Cast Iron Charlie",
  "messageId": "19e8c4d77880e2c3",
  "subject": "CIC Archive Batch 12",
  "filename": "exhibit_A.pdf",
  "destPath": "...",
  "sizeBytes": 204800
}
```

Event types: `server_started`, `initialization_failed`, `label_applied`, `label_apply_failed`, `rule_learned`, `triage_action_committed`, `auto_staging_triggered`, `attachment_staged`, `attachment_stage_failed`, `triage_scan_complete`, `tool_error`.

## 7. Scheduled Execution

The daily triage scan runs at 07:00 AM local time via Claude Desktop's scheduled task system (`daily-email-triage`). The scheduled prompt handles Gmail labeling and Google Calendar event creation for action items. The `execute_24h_triage_scan` MCP tool handles attachment staging inline.

Requires Claude Desktop to be running at scheduled time. If closed, the task runs on next launch.
