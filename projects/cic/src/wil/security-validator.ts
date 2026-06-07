/**
 * Security Hardening & Validation (Phase 46.6)
 *
 * Remove all API keys from CIC config.
 * Enforce file sandbox (/cic_workspace only).
 * Ensure all shell commands are non-interactive.
 * Validate workspace root scoping.
 */

import * as path from 'path';

export interface SecurityValidationResult {
  valid: boolean;
  message?: string;
  violations?: string[];
}

const WORKSPACE_ROOT = process.env.CIC_WORKSPACE || '/cic_workspace';
const FORBIDDEN_ENV_VARS = [
  'API_KEY',
  'SECRET_KEY',
  'PASSWORD',
  'TOKEN',
  'CREDENTIAL',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'DATABASE_PASSWORD'
];

const FORBIDDEN_SHELL_FLAGS = ['-i', '--interactive', '-it', '--login'];
const FORBIDDEN_CONFIG_PATHS = [
  '.env',
  '.env.local',
  '.env.secret',
  'config.secret.json',
  'credentials.json',
  'secrets.json',
  'apikeys.json'
];

export class SecurityValidator {
  /**
   * Validate shell command for interactive flags and safety
   */
  static validateShellCommand(command: string): SecurityValidationResult {
    const violations: string[] = [];

    // Check for forbidden flags
    for (const flag of FORBIDDEN_SHELL_FLAGS) {
      if (command.includes(flag)) {
        violations.push(`Interactive flag detected: ${flag}`);
      }
    }

    // Check for common credential patterns in command
    if (this.containsCredentialPattern(command)) {
      violations.push('Credential pattern detected in command');
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate file path is within workspace
   */
  static validateFilePath(filePath: string): SecurityValidationResult {
    const violations: string[] = [];
    const resolved = path.resolve(filePath);
    const normalized = path.normalize(resolved);
    // Normalize to forward-slash and strip Windows drive letter (C:) for cross-platform comparison
    const toUnix = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '');
    const normalizedUnix = toUnix(normalized);
    const workspaceUnix = toUnix(WORKSPACE_ROOT);

    // Must be within workspace
    if (!normalizedUnix.startsWith(workspaceUnix)) {
      violations.push(`Path outside workspace: ${filePath} (workspace: ${WORKSPACE_ROOT})`);
    }

    // Check for path traversal attempts
    if (normalized.includes('..') || filePath.includes('..')) {
      violations.push('Path traversal detected');
    }

    // Check for forbidden config files
    const fileName = path.basename(filePath);
    if (FORBIDDEN_CONFIG_PATHS.includes(fileName.toLowerCase())) {
      violations.push(`Forbidden file: ${fileName}`);
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate configuration object for embedded credentials
   */
  static validateConfig(config: Record<string, unknown>): SecurityValidationResult {
    const violations: string[] = [];

    this.checkConfigRecursive(config, '', violations);

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate environment variables for leaked credentials
   */
  static validateEnvironment(): SecurityValidationResult {
    const violations: string[] = [];

    for (const forbiddenVar of FORBIDDEN_ENV_VARS) {
      if (process.env[forbiddenVar]) {
        violations.push(`Leaked environment variable: ${forbiddenVar}`);
      }
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate HTTP request for credentials in URL
   */
  static validateHttpUrl(url: string): SecurityValidationResult {
    const violations: string[] = [];

    try {
      const parsed = new URL(url);

      // Check for credentials in query params
      const credentialParams = ['key', 'token', 'api_key', 'password', 'secret', 'auth'];
      for (const param of credentialParams) {
        if (parsed.searchParams.has(param)) {
          violations.push(`Credential in URL parameter: ${param}`);
        }
      }

      // Check for credentials in basic auth
      if (parsed.username || parsed.password) {
        violations.push('Basic auth credentials in URL');
      }
    } catch (error) {
      violations.push(`Invalid URL: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate model prompt for credential leakage
   */
  static validatePrompt(prompt: string): SecurityValidationResult {
    const violations: string[] = [];

    if (this.containsCredentialPattern(prompt)) {
      violations.push('Credential pattern detected in prompt');
    }

    // Check for requests to output credentials — allow articles ("the") between verb and noun
    const actionVerbs = ['output', 'return', 'show', 'print', 'display', 'give', 'provide', 'send'];
    const credWords = ['password', 'api key', 'api_key', 'secret key', 'secret', 'token', 'credential'];
    const lowerPrompt = prompt.toLowerCase();
    const hasAction = actionVerbs.some(v => lowerPrompt.includes(v));
    const hasCred = credWords.some(c => lowerPrompt.includes(c));
    if (hasAction && hasCred) {
      violations.push('Credential phrase detected in prompt');
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Validate request headers for leaked credentials
   */
  static validateHeaders(headers: Record<string, unknown>): SecurityValidationResult {
    const violations: string[] = [];

    const dangerousHeaders = ['authorization', 'x-api-key', 'x-auth-token', 'x-secret-token'];
    for (const header of dangerousHeaders) {
      const value = headers[header];
      if (value && typeof value === 'string' && value.length > 0) {
        violations.push(`Credential in request header: ${header}`);
      }
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  /**
   * Get security report for initialization
   */
  static getSecurityReport(): Record<string, SecurityValidationResult> {
    return {
      environment: this.validateEnvironment(),
      config: this.validateConfig(process.env as any),
      workspace: {
        valid: process.env.CIC_WORKSPACE ? true : false,
        message: `Workspace root: ${WORKSPACE_ROOT}`
      }
    };
  }

  private static containsCredentialPattern(text: string): boolean {
    const patterns = [
      /api[_-]?key\s*[:=]\s*['\"]?[a-zA-Z0-9\-_.]+['\"]?/i,
      /secret\s*[:=]\s*['\"]?[a-zA-Z0-9\-_.]+['\"]?/i,
      /password\s*[:=]\s*['\"]?[a-zA-Z0-9\-_.]+['\"]?/i,
      /token\s*[:=]\s*['\"]?[a-zA-Z0-9\-_.]+['\"]?/i,
      /bearer\s+[a-zA-Z0-9\-_.]+/i,
      /aws_secret_access_key\s*[:=]/i,
      /[a-z0-9]{40,}/i // Long hex-like strings
    ];

    return patterns.some((pattern) => pattern.test(text));
  }

  private static checkConfigRecursive(obj: any, path: string, violations: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check key name
      if (this.isSuspiciousKey(key)) {
        violations.push(`Credential pattern in config key: ${currentPath}`);
      }

      // Check value
      if (typeof value === 'string') {
        if (this.containsCredentialPattern(value)) {
          violations.push(`Credential pattern in config: ${currentPath}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        this.checkConfigRecursive(value, currentPath, violations);
      }
    }
  }

  private static isSuspiciousKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return FORBIDDEN_ENV_VARS.some((forbidden) => lowerKey.includes(forbidden.toLowerCase()));
  }
}

export default SecurityValidator;
