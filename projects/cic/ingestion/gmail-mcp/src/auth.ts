/**
 * Gmail OAuth authentication handler
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const TOKEN_PATH = path.join(process.cwd(), 'gmail-token.json');

export class GmailAuth {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, redirectUrl: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl
    );
  }

  /**
   * Get authorization URL for user to grant access
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Save token for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  }

  /**
   * Load tokens from file if available
   */
  async loadSavedTokens(): Promise<boolean> {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
        this.oauth2Client.setCredentials(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading saved tokens:', error);
      return false;
    }
  }

  /**
   * Refresh access token if needed
   */
  async ensureValidCredentials(): Promise<void> {
    const credentials = this.oauth2Client.credentials;

    if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
      await this.oauth2Client.refreshAccessToken();
      const newTokens = this.oauth2Client.credentials;
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(newTokens, null, 2));
    }
  }

  /**
   * Get authenticated Gmail client
   */
  getGmailClient() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get the OAuth2 client for direct API calls
   */
  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }
}

export function createAuthHandler(
  clientId: string,
  clientSecret: string,
  redirectUrl: string
): GmailAuth {
  return new GmailAuth(clientId, clientSecret, redirectUrl);
}
