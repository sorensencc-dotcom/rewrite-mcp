/**
 * Gmail MCP Server Tools Implementation
 */
import { gmail_v1 } from 'googleapis';
import { EmailMetadata, EmailContent, Label, AnalysisResult } from './types.js';
export declare class GmailTools {
    private gmail;
    constructor(gmailClient: gmail_v1.Gmail);
    /**
     * List unread emails from the last N hours
     */
    listUnreadEmails(maxResults?: number, hoursBack?: number): Promise<EmailMetadata[]>;
    /**
     * Get email metadata (headers only, no body)
     */
    private getEmailMetadata;
    /**
     * Read full email content
     */
    readEmail(messageId: string): Promise<EmailContent | null>;
    /**
     * Apply labels to messages
     */
    applyLabels(messageIds: string[], labelNames: string[]): Promise<Record<string, boolean>>;
    /**
     * Get all labels
     */
    getLabels(): Promise<Label[]>;
    /**
     * Create a new label
     */
    private createLabel;
    /**
     * Search emails with Gmail query syntax
     */
    searchEmails(query: string, maxResults?: number): Promise<EmailMetadata[]>;
    /**
     * Analyze email content for categorization
     */
    analyzeEmail(messageId: string): Promise<AnalysisResult>;
}
//# sourceMappingURL=tools.d.ts.map