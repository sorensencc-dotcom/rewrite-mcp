/**
 * Gmail OAuth authentication handler
 */
import { OAuth2Client } from 'google-auth-library';
export declare class GmailAuth {
    private oauth2Client;
    constructor(clientId: string, clientSecret: string, redirectUrl: string);
    /**
     * Get authorization URL for user to grant access
     */
    getAuthUrl(): string;
    /**
     * Exchange authorization code for tokens
     */
    getTokensFromCode(code: string): Promise<void>;
    /**
     * Load tokens from file if available
     */
    loadSavedTokens(): Promise<boolean>;
    /**
     * Refresh access token if needed
     */
    ensureValidCredentials(): Promise<void>;
    /**
     * Get authenticated Gmail client
     */
    getGmailClient(): import("googleapis").gmail_v1.Gmail;
    /**
     * Get the OAuth2 client for direct API calls
     */
    getOAuth2Client(): OAuth2Client;
}
export declare function createAuthHandler(clientId: string, clientSecret: string, redirectUrl: string): GmailAuth;
//# sourceMappingURL=auth.d.ts.map