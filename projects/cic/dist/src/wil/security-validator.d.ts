/**
 * Security Hardening & Validation (Phase 46.6)
 *
 * Remove all API keys from CIC config.
 * Enforce file sandbox (/cic_workspace only).
 * Ensure all shell commands are non-interactive.
 * Validate workspace root scoping.
 */
export interface SecurityValidationResult {
    valid: boolean;
    message?: string;
    violations?: string[];
}
export declare class SecurityValidator {
    /**
     * Validate shell command for interactive flags and safety
     */
    static validateShellCommand(command: string): SecurityValidationResult;
    /**
     * Validate file path is within workspace
     */
    static validateFilePath(filePath: string): SecurityValidationResult;
    /**
     * Validate configuration object for embedded credentials
     */
    static validateConfig(config: Record<string, unknown>): SecurityValidationResult;
    /**
     * Validate environment variables for leaked credentials
     */
    static validateEnvironment(): SecurityValidationResult;
    /**
     * Validate HTTP request for credentials in URL
     */
    static validateHttpUrl(url: string): SecurityValidationResult;
    /**
     * Validate model prompt for credential leakage
     */
    static validatePrompt(prompt: string): SecurityValidationResult;
    /**
     * Validate request headers for leaked credentials
     */
    static validateHeaders(headers: Record<string, unknown>): SecurityValidationResult;
    /**
     * Get security report for initialization
     */
    static getSecurityReport(): Record<string, SecurityValidationResult>;
    private static containsCredentialPattern;
    private static checkConfigRecursive;
    private static isSuspiciousKey;
}
export default SecurityValidator;
