/**
 * Gmail MCP Server Tools Implementation
 */
export class GmailTools {
    constructor(gmailClient) {
        this.gmail = gmailClient;
    }
    /**
     * List unread emails from the last N hours
     */
    async listUnreadEmails(maxResults = 50, hoursBack = 24) {
        try {
            const afterDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];
            const query = `is:unread after:${afterDate}`;
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults,
                fields: 'messages(id,threadId),nextPageToken'
            });
            const messages = response.data.messages || [];
            // Get metadata for each message
            const emailMetadata = [];
            for (const msg of messages) {
                const metadata = await this.getEmailMetadata(msg.id);
                if (metadata) {
                    emailMetadata.push(metadata);
                }
            }
            return emailMetadata;
        }
        catch (error) {
            throw new Error(`Failed to list unread emails: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get email metadata (headers only, no body)
     */
    async getEmailMetadata(messageId) {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: ['From', 'To', 'Subject', 'Date']
            });
            const msg = response.data;
            const headers = msg.payload?.headers || [];
            const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
            return {
                messageId: msg.id || '',
                threadId: msg.threadId || '',
                sender: getHeader('From'),
                subject: getHeader('Subject'),
                date: getHeader('Date'),
                snippet: msg.snippet || '',
                labelIds: msg.labelIds || [],
                unread: (msg.labelIds || []).includes('UNREAD')
            };
        }
        catch (error) {
            console.error(`Failed to get metadata for ${messageId}:`, error);
            return null;
        }
    }
    /**
     * Read full email content
     */
    async readEmail(messageId) {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });
            const msg = response.data;
            const headers = msg.payload?.headers || [];
            const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
            // Extract body
            let plainText = '';
            let html = '';
            if (msg.payload?.parts) {
                for (const part of msg.payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }
                    else if (part.mimeType === 'text/html' && part.body?.data) {
                        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }
                }
            }
            else if (msg.payload?.body?.data) {
                plainText = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
            }
            return {
                messageId: msg.id || '',
                threadId: msg.threadId || '',
                sender: getHeader('From'),
                to: getHeader('To'),
                cc: getHeader('Cc'),
                subject: getHeader('Subject'),
                date: getHeader('Date'),
                plainText: plainText || undefined,
                html: html || undefined,
                labelIds: msg.labelIds || [],
                headers: Object.fromEntries(headers.map(h => [h.name || '', h.value || '']))
            };
        }
        catch (error) {
            throw new Error(`Failed to read email: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Apply labels to messages
     */
    async applyLabels(messageIds, labelNames) {
        try {
            // First, resolve label names to IDs
            const labels = await this.getLabels();
            const labelIds = [];
            for (const labelName of labelNames) {
                const label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
                if (label) {
                    labelIds.push(label.id);
                }
                else {
                    // Create label if it doesn't exist
                    const newLabel = await this.createLabel(labelName);
                    labelIds.push(newLabel.id);
                }
            }
            // Apply labels to messages
            const results = {};
            for (const messageId of messageIds) {
                try {
                    await this.gmail.users.messages.modify({
                        userId: 'me',
                        id: messageId,
                        requestBody: {
                            addLabelIds: labelIds
                        }
                    });
                    results[messageId] = true;
                }
                catch (error) {
                    console.error(`Failed to apply labels to ${messageId}:`, error);
                    results[messageId] = false;
                }
            }
            return results;
        }
        catch (error) {
            throw new Error(`Failed to apply labels: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get all labels
     */
    async getLabels() {
        try {
            const response = await this.gmail.users.labels.list({
                userId: 'me'
            });
            const labels = response.data.labels || [];
            return labels.map(label => {
                const labelType = (label.type || 'user');
                return {
                    id: label.id || '',
                    name: label.name || '',
                    type: labelType,
                    messagesTotal: label.messagesTotal,
                    messagesUnread: label.messagesUnread
                };
            });
        }
        catch (error) {
            throw new Error(`Failed to get labels: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Create a new label
     */
    async createLabel(labelName) {
        try {
            const response = await this.gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                }
            });
            return {
                id: response.data.id || '',
                name: response.data.name || '',
                type: response.data.type || 'user'
            };
        }
        catch (error) {
            throw new Error(`Failed to create label: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Search emails with Gmail query syntax
     */
    async searchEmails(query, maxResults = 50) {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults,
                fields: 'messages(id,threadId),nextPageToken'
            });
            const messages = response.data.messages || [];
            const emailMetadata = [];
            for (const msg of messages) {
                const metadata = await this.getEmailMetadata(msg.id);
                if (metadata) {
                    emailMetadata.push(metadata);
                }
            }
            return emailMetadata;
        }
        catch (error) {
            throw new Error(`Failed to search emails: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Analyze email content for categorization
     */
    async analyzeEmail(messageId) {
        try {
            const email = await this.readEmail(messageId);
            if (!email) {
                throw new Error('Email not found');
            }
            // Simple categorization logic
            const content = (email.plainText ||
                email.html ||
                email.subject ||
                '').toLowerCase();
            let category = 'NOISE';
            let confidence = 0.5;
            let reasoning = '';
            // Check for action-required indicators
            if (content.includes('payment') ||
                content.includes('invoice') ||
                content.includes('confirm') ||
                content.includes('verify') ||
                content.includes('action required') ||
                content.includes('deadline') ||
                content.includes('expires') ||
                content.includes('expiration')) {
                category = 'ACTION_REQUIRED';
                confidence = 0.9;
                reasoning = 'Contains action-required keywords (payment, confirm, verify, deadline, expires)';
            }
            // Check for newsletter indicators
            else if (content.includes('newsletter') ||
                content.includes('digest') ||
                content.includes('news') ||
                email.sender.toLowerCase().includes('newsletter')) {
                category = 'NEWSLETTER';
                confidence = 0.85;
                reasoning = 'Appears to be newsletter/digest content';
            }
            // Check for promotional indicators
            else if (content.includes('sale') ||
                content.includes('discount') ||
                content.includes('offer') ||
                content.includes('coupon') ||
                content.includes('promotion') ||
                content.includes('unsubscribe')) {
                category = 'PROMOTION';
                confidence = 0.8;
                reasoning = 'Contains promotional content (sale, discount, offer, unsubscribe)';
            }
            else {
                category = 'NOISE';
                confidence = 0.6;
                reasoning = 'No clear indicators of action, newsletter, or promotion';
            }
            return {
                messageId,
                category,
                confidence,
                reasoning
            };
        }
        catch (error) {
            throw new Error(`Failed to analyze email: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=tools.js.map