# Memos/Joplin Ingestion Manual

This guide describes how to run and configure the Memos → Joplin ingestion pipeline.

## Configuration

The worker requires the following environment variables (defined in `.env` or exported):

### Memos
*   `MEMOS_BASE_URL`: The URL of your Memos instance (e.g., `https://memos.example.com`).
*   `MEMOS_API_TOKEN`: Your personal access token from Memos (Settings → Access Tokens).
*   `MEMOS_POLL_INTERVAL_MS`: (Optional) Polling interval in milliseconds. Default: `30000` (30s).

### Joplin (Optional for Mirroring)
*   `JOPLIN_API_TOKEN`: Your Joplin Web Clipper token (Tools → Web Clipper options → Copy token).
*   `JOPLIN_BASE_URL`: (Optional) Joplin Web Clipper URL. Default: `http://localhost:41184`.

## Running the Ingestion Worker

From the `rewrite-mcp/projects/cic/ingestion` directory:

```bash
node src/memos/run-ingestion.js
```

## Tagging Schema

The worker uses the following primary tags to route memos:

| Tag | Routing Key | Joplin Destination |
| :--- | :--- | :--- |
| `task` | `cic.tasks.inbox` | `Tasks/Inbox` |
| `idea` | `cic.ideas.inbox` | `Ideas/Sandbox` |
| `ingest` | `cic.rewritelabs.ingest` (if `+rl`) | `Rewrite Labs/To-Ingest` |
| `ingest` | `cic.core.ingest` (if `+cic`) | `CIC/Ingestion Notes` |
| `followup` | `cic.tasks.followup` | `Tasks/Waiting` |
| `personal` | `cic.personal.inbox` | `Personal/Life Admin` |
| `reference` | `cic.reference.inbox` | `Reference/Notes` |
| `log` | `cic.logs.journal` | `Personal/Logs` |

### Secondary Tags
Any other tags added to the memo (e.g., `urgent`, `p1`, `rl`, `cic`) will be preserved as context tags and added to the Joplin note.

## Persistence
The worker maintains its last processed memo timestamp in `projects/cic/ingestion/data/memos_state.json` to ensure it only processes new items on restart.
