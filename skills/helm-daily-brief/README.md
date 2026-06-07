# HELM Daily Brief (45.5)

## Purpose
Generate morning briefing from Calendar, Gmail, Finance, and Deals data via MCP servers.

Creates a consolidated daily briefing synthesizing events, emails, and financial information from multiple sources. Supports caching for offline access, graceful degradation when MCP servers are unavailable, and flexible formatting (text or JSON).

## Input

```javascript
{
  "includeEvents": true,         // Optional: include calendar (default: true)
  "includeEmails": true,         // Optional: include emails (default: true)
  "includeFinance": true,        // Optional: include finances (default: true)
  "maxEventsPerDay": 10,         // Optional: max calendar events (default: 10)
  "maxEmailCount": 5,            // Optional: max emails to summarize (default: 5)
  "format": "text",              // Optional: "text" or "json" (default: text)
  "forceRefresh": false          // Optional: skip cache, fetch fresh (default: false)
}
```

## Output

### Text Format (Default)
```
═══════════════════════════════════════════════════════════
HELM DAILY BRIEF — Friday, June 7, 2026
═══════════════════════════════════════════════════════════

📅 TODAY'S SCHEDULE
─────────────────────────
  1. 09:00 AM — Team Standup
     Location: Conference Room A
     Attendees: 8
  2. 10:30 AM — Client Review
     Location: Conference Room B
     Attendees: 5
  3. 01:00 PM — Product Planning
     Location: Conference Room C
     Attendees: 3

📧 HIGH-PRIORITY MESSAGES
─────────────────────────
  1. 🔴 From: boss@company.com
     Subject: Q3 Budget Review
     "Please send your Q3 budget forecast..."
  
  2. 🟡 From: team@company.com
     Subject: Sprint Retrospective Notes
     "Thanks for your feedback in today's retro..."

  Unread: 7 messages

💰 FINANCIAL SNAPSHOT
─────────────────────────
  Net Worth: $60,913
  Checking: $15,234
  Savings: $45,678

  Today's Spending: $234.50
  Daily Budget: $500.00
  Remaining: $265.50 (53%)
  Trend: 📈 up

═══════════════════════════════════════════════════════════
Generated: 8:42:15 AM
```

### JSON Format
```javascript
{
  "success": true,
  "briefing": {
    "type": "daily-briefing",
    "timestamp": "2026-06-07T08:42:15.000Z",
    "sections": {
      "schedule": "📅 TODAY'S SCHEDULE\n  1. 09:00 AM — Team Standup...",
      "messages": "📧 HIGH-PRIORITY MESSAGES\n  1. 🔴 From: boss@company.com...",
      "finance": "💰 FINANCIAL SNAPSHOT\n  Net Worth: $60,913..."
    },
    "rawText": "═══════════════════════════════════════════════════════════\n..."
  },
  "format": "json",
  "generatedAt": "2026-06-07T08:42:15.000Z",
  "elapsedMs": 450
}
```

## Examples

### Generate Full Daily Brief
```javascript
const result = await skill.invoke('helm-daily-brief', {
  includeEvents: true,
  includeEmails: true,
  includeFinance: true,
  format: 'text'
});
// → Returns complete briefing with all sections
```

### Generate Finance-Only Brief
```javascript
const result = await skill.invoke('helm-daily-brief', {
  includeEvents: false,
  includeEmails: false,
  includeFinance: true,
  format: 'text'
});
// → Returns only financial snapshot
```

### Get Fresh Data (Skip Cache)
```javascript
const result = await skill.invoke('helm-daily-brief', {
  forceRefresh: true,
  format: 'json'
});
// → Fetches live data from MCP servers, returns JSON
```

### Limit Data Volume
```javascript
const result = await skill.invoke('helm-daily-brief', {
  includeEvents: true,
  includeEmails: true,
  maxEventsPerDay: 5,
  maxEmailCount: 3,
  format: 'text'
});
// → Returns briefing with max 5 events and 3 emails
```

### Use Cached Briefing
```javascript
const result = await skill.invoke('helm-daily-brief', {
  forceRefresh: false  // Default
});
// → Returns cached briefing if available (up to 24h old)
if (result.source === 'cached') {
  console.log('Cached at:', result.cachedAt);
  console.log('Expires at:', result.expiresAt);
}
```

## Integration Points

### Dependencies
- **MCP: Google Calendar** — Fetch next 24 hours of events
- **MCP: Gmail** — Fetch unread/high-priority messages
- **MCP: Era Context** — Fetch financial snapshot (net worth, spending, budgets)
- **context-memory-manager** — Cache briefing with 24h TTL

### Data Flow
```
Input Validation
    ↓
Check Cache (context-memory-manager)
    ├─→ If cached & not expired → Return cached
    └─→ Otherwise, fetch live data
    ↓
Parallel Fetch from MCP Servers:
    ├─→ Google Calendar API
    ├─→ Gmail API
    └─→ Era Context API
    ↓
Graceful Degradation:
    ├─→ If Calendar fails → Skip events section
    ├─→ If Gmail fails → Skip emails section
    └─→ If Finance fails → Skip finance section
    ↓
Compile Briefing (text or JSON)
    ↓
Cache Result (24h TTL)
    ↓
Return Formatted Output
```

## Caching Strategy

**Default TTL:** 24 hours (expires at midnight)

**Cache Key:** `helm-daily-brief`

**Refresh Behavior:**
- Automatic refresh if cache expired
- Force refresh via `forceRefresh: true`
- Graceful fallback if MCP servers unavailable

**Stale Cache Usage:**
- Returns cached if available and valid
- Always returns `source` field ("live" or "cached")

## Error Handling

| Error | Cause | Behavior |
|-------|-------|----------|
| MCP Calendar down | Network/API error | Skips events section, returns other sections |
| MCP Gmail down | Network/API error | Skips emails section, returns other sections |
| MCP Finance down | Network/API error | Skips finance section, returns other sections |
| Invalid format | Bad input | Rejects immediately |
| Invalid maxEvents | Out of range | Rejects immediately |

## Performance

- **With cache hit:** ~50-100ms
- **Live fetch:** ~300-800ms (parallel MCP calls)
- **Cache storage:** ~2-5KB per briefing
- **Cache expiry:** 24 hours (midnight)

## Formatting Notes

### Text Format
- Human-readable plain text
- Section dividers (─────)
- Emoji indicators (📅 🔴 💰 etc.)
- Sorted by priority/importance
- Width optimized for terminal/email display

### JSON Format
- Machine-parseable
- Structured sections
- Includes raw text for fallback
- Timestamp in ISO 8601 format

## Accessibility

- **High-contrast:** Emoji indicators + text labels
- **Terminal-friendly:** Fixed-width fonts, no unicode issues
- **Email-friendly:** Text format works in any email client
- **Offline:** Cached version available if network fails

## Notes

- **Live data:** Calendar, Gmail, Finance fetches happen in parallel for speed
- **Concurrency:** Safe to call multiple times (cache handles deduplication)
- **MCP credential setup:** Era Context may require initial authentication
- **Data freshness:** Cache TTL is 24h; use forceRefresh for immediate updates
- **Privacy:** Financial data cached locally; respects MCP scoping rules
