# Gmail MCP Server

A robust Model Context Protocol (MCP) server for Gmail operations and email triage automation.

## Features

- **List Unread Emails** — Fetch unread messages from the last N hours
- **Read Email** — Get full email content with headers and decoded body
- **Apply Labels** — Add labels to emails (creates labels if they don't exist)
- **Search Emails** — Search using Gmail query syntax
- **Get Labels** — List all available labels in the mailbox
- **Analyze Email** — Categorize emails as ACTION_REQUIRED, NEWSLETTER, PROMOTION, or NOISE

## Setup

### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials JSON file

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file with:

```
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URL=http://localhost:3000/callback
GMAIL_ACCESS_TOKEN=your_access_token
```

### 4. Build

```bash
npm run build
```

### 5. Test with MCP Inspector

```bash
npm run inspect
```

## Usage

The server exposes the following tools:

### list_unread_emails
```
Input:
  - maxResults: number (1-100, default 50)
  - hoursBack: number (default 24)

Output:
  Array of email metadata with sender, subject, date, labels
```

### read_email
```
Input:
  - messageId: string

Output:
  Full email content including headers, body (plain + HTML), labels
```

### apply_labels
```
Input:
  - messageIds: string[]
  - labelNames: string[]

Output:
  Success/failure status per message
```

### search_emails
```
Input:
  - query: string (Gmail query syntax)
  - maxResults: number (1-100, default 50)

Output:
  Array of matching emails with metadata
```

### get_labels
No input. Returns all available labels with message counts.

### analyze_email
```
Input:
  - messageId: string

Output:
  Category (ACTION_REQUIRED, NEWSLETTER, PROMOTION, NOISE) with confidence score
```

## Email Triage Workflow Example

1. Call `list_unread_emails` to get recent unread emails
2. For each email, call `analyze_email` to categorize it
3. Call `apply_labels` to tag emails based on category
4. Use `search_emails` for advanced filtering

## OAuth Token Management

The server requires an active Gmail API access token. Tokens can be obtained through:

- OAuth 2.0 Authorization Code flow (recommended for production)
- Service account with domain-wide delegation
- Manual token refresh

## Architecture

- `src/index.ts` — Main server with MCP tool registration
- `src/types.ts` — TypeScript type definitions
- `src/tools.ts` — Gmail API wrapper and tool implementations
- `src/auth.ts` — OAuth authentication handlers

## Error Handling

All tools include proper error handling with descriptive messages:
- Gmail API errors are caught and returned with context
- Missing emails/labels are handled gracefully
- Rate limiting and quota errors are reported

## Security

- OAuth tokens are stored securely in `gmail-token.json` (add to .gitignore)
- Only required Gmail scopes are requested (readonly + modify)
- No sensitive data is logged
- Environment variables should be used for credentials
