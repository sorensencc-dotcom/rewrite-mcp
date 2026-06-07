/**
 * Type definitions for Gmail MCP Server
 */

export interface EmailMetadata {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
  unread: boolean;
}

export interface EmailContent {
  messageId: string;
  threadId: string;
  sender: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  plainText?: string;
  html?: string;
  labelIds: string[];
  headers: Record<string, string>;
}

export interface Label {
  id: string;
  name: string;
  type: 'user' | 'system';
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface SearchQuery {
  query: string;
  maxResults?: number;
}

export interface LabelOperation {
  messageId: string;
  labelsToAdd?: string[];
  labelsToRemove?: string[];
}

export interface AnalysisResult {
  messageId: string;
  category: 'ACTION_REQUIRED' | 'NEWSLETTER' | 'PROMOTION' | 'NOISE';
  confidence: number;
  reasoning: string;
}
