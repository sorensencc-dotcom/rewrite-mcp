// CIC WIL — SecurityPolicy enforcement engine
// Blocks dangerous operations at adapter boundaries
export class SecurityPolicy {
    constructor(config) {
        this.rules = [];
        this.signals = [];
        this.config = config || {};
        if (config && Object.keys(config).length > 0) {
            this.initializeFromConfig(config);
        }
        else {
            this.initializeDefaults();
        }
    }
    initializeFromConfig(config) {
        if (config.shell) {
            const shellCfg = config.shell;
            if (shellCfg.deniedPatterns) {
                shellCfg.deniedPatterns.forEach((pattern) => {
                    this.rules.push({
                        id: `shell_deny_${this.rules.length}`,
                        type: 'shell',
                        action: 'deny',
                        pattern,
                        reason: `Denied by security policy: ${pattern}`,
                    });
                });
            }
            if (shellCfg.allowedCommands) {
                shellCfg.allowedCommands.forEach((cmd) => {
                    this.rules.push({
                        id: `shell_allow_${this.rules.length}`,
                        type: 'shell',
                        action: 'allow',
                        pattern: `^${cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                        reason: `Allowed by security policy`,
                    });
                });
            }
        }
        if (config.http && config.http.allowedDomains) {
            config.http.allowedDomains.forEach((domain) => {
                this.rules.push({
                    id: `http_allow_${this.rules.length}`,
                    type: 'http',
                    action: 'allow',
                    pattern: `^https?:\\/\\/(.*\\.)?${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                    reason: `Domain allowed by security policy`,
                });
            });
            this.rules.push({
                id: 'http_external_deny',
                type: 'http',
                action: 'deny',
                pattern: /^https?:\/\//,
                reason: 'External HTTP requires allowlist entry',
            });
        }
        if (config.model?.maxTokens) {
            this.config.model = { maxTokens: config.model.maxTokens };
        }
    }
    initializeDefaults() {
        // Dangerous shell commands — block
        this.rules.push({
            id: 'shell_rm_rf',
            type: 'shell',
            action: 'deny',
            pattern: /^rm\s+(-r|-f|--recursive|--force).*/i,
            reason: 'Recursive deletion blocked',
        }, {
            id: 'shell_dd',
            type: 'shell',
            action: 'deny',
            pattern: /^dd\s+/i,
            reason: 'Disk write at device level blocked',
        }, {
            id: 'shell_mkfs',
            type: 'shell',
            action: 'deny',
            pattern: /^mkfs/i,
            reason: 'Filesystem format blocked',
        }, {
            id: 'shell_format',
            type: 'shell',
            action: 'deny',
            pattern: /^format\s+/i,
            reason: 'Drive format blocked',
        }, {
            id: 'shell_reboot',
            type: 'shell',
            action: 'deny',
            pattern: /^(reboot|shutdown|halt|poweroff)/i,
            reason: 'System reboot blocked',
        });
        // Safe shell commands — allow
        this.rules.push({
            id: 'shell_ls',
            type: 'shell',
            action: 'allow',
            pattern: /^ls\s*/,
            reason: 'Directory listing allowed',
        }, {
            id: 'shell_cat',
            type: 'shell',
            action: 'allow',
            pattern: /^cat\s+/,
            reason: 'File read allowed',
        }, {
            id: 'shell_echo',
            type: 'shell',
            action: 'allow',
            pattern: /^echo\s+/,
            reason: 'Echo allowed',
        }, {
            id: 'shell_grep',
            type: 'shell',
            action: 'allow',
            pattern: /^grep\s+/,
            reason: 'Text search allowed',
        });
        // File operations — enforce root boundary
        this.rules.push({
            id: 'file_absolute_path',
            type: 'file',
            action: 'deny',
            pattern: /^\//,
            reason: 'Absolute paths require explicit allowlist entry',
        }, {
            id: 'file_parent_escape',
            type: 'file',
            action: 'deny',
            pattern: /\.\.\//,
            reason: 'Parent directory escape (..) blocked',
        });
        // HTTP — enforce domain allowlist
        this.rules.push({
            id: 'http_localhost',
            type: 'http',
            action: 'allow',
            pattern: /^https?:\/\/(localhost|127\.0\.0\.1|::1)/,
            reason: 'Localhost allowed',
        }, {
            id: 'http_internal',
            type: 'http',
            action: 'allow',
            pattern: /^https?:\/\/([a-zA-Z0-9-]*\.)*internal(\.[a-zA-Z0-9-]*)*\//,
            reason: 'Internal domain allowed',
        }, {
            id: 'http_github',
            type: 'http',
            action: 'allow',
            pattern: /^https:\/\/github\.com\//,
            reason: 'GitHub allowed',
        }, {
            id: 'http_external_blocked',
            type: 'http',
            action: 'deny',
            pattern: /^https?:\/\/(?!.*internal|.*github\.com|localhost|127\.0\.0\.1|::1).*/,
            reason: 'External HTTP requires allowlist',
        });
        // Model — enforce token limits
        this.rules.push({
            id: 'model_max_tokens',
            type: 'model',
            action: 'allow',
            pattern: /^\d+$/,
            reason: 'Token limits enforced per config',
        });
        // Browser — restrict dangerous searches
        this.rules.push({
            id: 'browser_exec',
            type: 'browser',
            action: 'deny',
            pattern: /^(exec|system|shell|bash|cmd|powershell)/i,
            reason: 'Shell command injection blocked',
        });
    }
    enforceShell(command) {
        return this.enforceRule('shell', command);
    }
    enforceFile(path) {
        return this.enforceRule('file', path);
    }
    enforceFilePath(path, isWrite = false) {
        const allowedRoots = this.config.file?.allowedRoots || [];
        const readOnlyRoots = this.config.file?.readOnlyRoots || [];
        // Check if path is under an allowed root
        const isAllowed = allowedRoots.some((root) => path.startsWith(root));
        if (!isAllowed && allowedRoots.length > 0) {
            const signal = this.createSignal('file', path, `Path not in allowed roots: ${allowedRoots.join(', ')}`, 'high', true);
            this.signals.push(signal);
            return {
                allowed: false,
                reason: `Path not in allowed roots`,
                signal,
            };
        }
        // Check if write to read-only root
        if (isWrite) {
            const isReadOnly = readOnlyRoots.some((root) => path.startsWith(root));
            if (isReadOnly) {
                const signal = this.createSignal('file', path, `Write to read-only path blocked`, 'medium', true);
                this.signals.push(signal);
                return {
                    allowed: false,
                    reason: `Cannot write to read-only path`,
                    signal,
                };
            }
        }
        return {
            allowed: true,
            reason: `File path allowed`,
        };
    }
    enforceHttp(url) {
        return this.enforceRule('http', url);
    }
    enforceHttpDomain(url) {
        const allowedDomains = this.config.http?.allowedDomains || [];
        // Extract domain from URL
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const isAllowed = allowedDomains.some((domain) => {
                if (domain === 'localhost' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
                    return true;
                }
                if (domain === '127.0.0.1' && hostname === '127.0.0.1') {
                    return true;
                }
                if (hostname.endsWith(domain) || hostname === domain) {
                    return true;
                }
                return false;
            });
            if (!isAllowed && allowedDomains.length > 0) {
                const signal = this.createSignal('http', url, `Domain not in allowlist`, 'high', true);
                this.signals.push(signal);
                return {
                    allowed: false,
                    reason: `Domain not in allowlist`,
                    signal,
                };
            }
            return {
                allowed: true,
                reason: `HTTP domain allowed`,
            };
        }
        catch (e) {
            const signal = this.createSignal('http', url, `Invalid URL format`, 'medium', true);
            this.signals.push(signal);
            return {
                allowed: false,
                reason: `Invalid URL format`,
                signal,
            };
        }
    }
    enforceModel(tokenLimit) {
        const result = this.enforceRule('model', String(tokenLimit));
        if (tokenLimit > 100000) {
            return {
                allowed: false,
                reason: 'Token limit exceeds maximum (100k)',
                signal: this.createSignal('model', String(tokenLimit), 'Token limit exceeds maximum', 'high', false),
            };
        }
        return result;
    }
    enforceModelOptions(options) {
        const maxTokens = this.config.model?.maxTokens || 100000;
        const tempMax = this.config.model?.temperatureMax || 1.0;
        if (options.maxTokens && options.maxTokens > maxTokens) {
            const signal = this.createSignal('model', JSON.stringify(options), `Token limit ${options.maxTokens} exceeds max ${maxTokens}`, 'high', true);
            this.signals.push(signal);
            return {
                allowed: false,
                reason: `Token limit exceeds configured maximum`,
                signal,
            };
        }
        if (options.temperature && options.temperature > tempMax) {
            const signal = this.createSignal('model', JSON.stringify(options), `Temperature ${options.temperature} exceeds max ${tempMax}`, 'medium', true);
            this.signals.push(signal);
            return {
                allowed: false,
                reason: `Temperature exceeds configured maximum`,
                signal,
            };
        }
        return {
            allowed: true,
            reason: `Model options allowed`,
        };
    }
    enforceBrowser(query) {
        return this.enforceRule('browser', query);
    }
    enforceRule(type, value) {
        const applicableRules = this.rules.filter((r) => r.type === type);
        // First check allow rules (allow list takes precedence)
        for (const rule of applicableRules.filter((r) => r.action === 'allow')) {
            const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
            if (pattern.test(value)) {
                const signal = this.createSignal(type, value, rule.reason, 'low', false);
                this.signals.push(signal);
                return {
                    allowed: true,
                    reason: rule.reason,
                    signal,
                };
            }
        }
        // Then check deny rules (if not explicitly allowed)
        for (const rule of applicableRules.filter((r) => r.action === 'deny')) {
            const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
            if (pattern.test(value)) {
                const signal = this.createSignal(type, value, rule.reason, 'critical', true);
                this.signals.push(signal);
                return {
                    allowed: false,
                    reason: rule.reason,
                    signal,
                };
            }
        }
        // No matching rule — default deny for security
        const signal = this.createSignal(type, value, 'No matching policy rule', 'medium', true);
        this.signals.push(signal);
        return {
            allowed: false,
            reason: 'No matching policy rule',
            signal,
        };
    }
    createSignal(adapter, action, reason, severity, blocked) {
        return {
            signalId: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type: blocked ? 'violation' : 'audit',
            adapter,
            action,
            reason,
            severity,
            blocked,
        };
    }
    getSignals() {
        return [...this.signals];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    clearSignals() {
        this.signals = [];
    }
}
//# sourceMappingURL=SecurityPolicy.js.map