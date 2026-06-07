/**
 * Gmail MCP Server
 * Provides tools for Gmail email operations and triage
 */

import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailTools } from './tools.js';

// Environment variables for OAuth
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URL = process.env.GMAIL_REDIRECT_URL || 'http://localhost:3000/callback';
const ACCESS_TOKEN = process.env.GMAIL_ACCESS_TOKEN || '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables are required'
  );
  process.exit(1);
}

// Initialize OAuth2 client with access token
const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// Set the access token
if (ACCESS_TOKEN) {
  oauth2Client.setCredentials({ access_token: ACCESS_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
const gmailTools = new GmailTools(gmail);

// Create MCP server
const server = new McpServer({
  name: 'gmail-mcp',
  version: '1.0.0'
});

// Tool: List unread emails
server.registerTool(
  'list_unread_emails',
  {
    description:
      'Fetch unread emails from the last N hours. Returns email metadata including sender, subject, date, and labels.',
    inputSchema: z.object({
      maxResults: z.number().int().min(1).max(100).default(50).describe(
        'Maximum number of emails to return (default: 50, max: 100)'
      ),
      hoursBack: z.number().int().min(1).default(24).describe(
        'How many hours back to search (default: 24)'
      )
    })
  },
  async ({ maxResults = 50, hoursBack = 24 }) => {
    const emails = await gmailTools.listUnreadEmails(maxResults, hoursBack);
    return {
      content: [
        {
          type: 'text',
          text: `Found ${emails.length} unread emails:\n${JSON.stringify(emails, null, 2)}`
        }
      ],
      structuredContent: emails
    };
  }
);

// Tool: Read email content
server.registerTool(
  'read_email',
  {
    description:
      'Get the full content of an email including headers, body (plain text and HTML), and labels.',
    inputSchema: z.object({
      messageId: z.string().describe('The Gmail message ID')
    })
  },
  async ({ messageId }) => {
    const email = await gmailTools.readEmail(messageId);
    if (!email) {
      return {
        content: [{ type: 'text', text: 'Email not found' }],
        isError: true
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Email from ${email.sender}:\nSubject: ${email.subject}\n\n${email.plainText || email.html || '(no content)'}`
        }
      ],
      structuredContent: email
    };
  }
);

// Tool: Apply labels
server.registerTool(
  'apply_labels',
  {
    description:
      'Add labels to one or more emails. Creates labels if they do not exist.',
    inputSchema: z.object({
      messageIds: z.array(z.string()).describe('Array of Gmail message IDs to label'),
      labelNames: z
        .array(z.string())
        .describe('Array of label names to apply (e.g., ["@Action Required", "Follow-up"])')
    })
  },
  async ({ messageIds, labelNames }) => {
    const results = await gmailTools.applyLabels(messageIds, labelNames);
    const successful = Object.values(results).filter(v => v).length;
    return {
      content: [
        {
          type: 'text',
          text: `Applied labels to ${successful}/${messageIds.length} emails. Results: ${JSON.stringify(results, null, 2)}`
        }
      ],
      structuredContent: results
    };
  }
);

// Tool: Get all labels
server.registerTool(
  'get_labels',
  {
    description: 'Get a list of all labels in the Gmail mailbox'
  },
  async () => {
    const labels = await gmailTools.getLabels();
    return {
      content: [
        {
          type: 'text',
          text: `Available labels:\n${labels.map(l => `- ${l.name} (${l.messagesTotal || 0} messages)`).join('\n')}`
        }
      ],
      structuredContent: labels
    };
  }
);

// Tool: Search emails
server.registerTool(
  'search_emails',
  {
    description:
      'Search emails using Gmail query syntax (e.g., "from:someone@example.com", "subject:urgent", "is:unread").',
    inputSchema: z.object({
      query: z.string().describe(
        'Gmail search query (e.g., "from:example.com is:unread", "subject:invoice after:2024-01-01")'
      ),
      maxResults: z.number().int().min(1).max(100).default(50).describe(
        'Maximum results to return (default: 50, max: 100)'
      )
    })
  },
  async ({ query, maxResults = 50 }) => {
    const emails = await gmailTools.searchEmails(query, maxResults);
    return {
      content: [
        {
          type: 'text',
          text: `Found ${emails.length} emails matching "${query}":\n${JSON.stringify(emails, null, 2)}`
        }
      ],
      structuredContent: emails
    };
  }
);

// Tool: Analyze email for categorization
server.registerTool(
  'analyze_email',
  {
    description:
      'Analyze email content to categorize it as ACTION_REQUIRED, NEWSLETTER, PROMOTION, or NOISE. Useful for email triage automation.',
    inputSchema: z.object({
      messageId: z.string().describe('The Gmail message ID to analyze')
    })
  },
  async ({ messageId }) => {
    const analysis = await gmailTools.analyzeEmail(messageId);
    return {
      content: [
        {
          type: 'text',
          text: `Email analysis:\nCategory: ${analysis.category}\nConfidence: ${(analysis.confidence * 100).toFixed(1)}%\nReasoning: ${analysis.reasoning}`
        }
      ],
      structuredContent: analysis
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gmail MCP server started');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
