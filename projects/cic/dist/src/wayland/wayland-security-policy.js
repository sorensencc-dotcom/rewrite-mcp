// filename: wayland-security-policy.ts
// Wayland Security Policy
// Governance rules for tool execution with fine-grained permissions
export class WaylandSecurityPolicy {
    constructor(cfg) {
        this.rules = new Map();
        for (const rule of cfg.tools) {
            this.rules.set(rule.id, rule);
        }
    }
    isToolAllowed(id) {
        const rule = this.rules.get(id);
        return !!rule && rule.allowed;
    }
    getToolRule(id) {
        return this.rules.get(id);
    }
    validateShellCommand(id, command, workingDir) {
        const rule = this.rules.get(id);
        if (!rule || !rule.allowed)
            return false;
        // Check allowed commands
        if (rule.allowedCommands) {
            const cmdName = command.split(/\s+/)[0];
            if (!rule.allowedCommands.includes(cmdName)) {
                return false;
            }
        }
        // Check working directory
        if (rule.allowedPaths) {
            if (!rule.allowedPaths.some(p => workingDir.startsWith(p))) {
                return false;
            }
        }
        return true;
    }
    validateFileOperation(id, operation, path) {
        const rule = this.rules.get(id);
        if (!rule || !rule.allowed)
            return false;
        // Check write permission
        if (operation !== 'read' && !rule.allowWrite) {
            return false;
        }
        // Check path restrictions
        if (rule.allowedPaths) {
            if (!rule.allowedPaths.some(p => path.startsWith(p))) {
                return false;
            }
        }
        return true;
    }
    validateHttpRequest(id, host, method) {
        const rule = this.rules.get(id);
        if (!rule || !rule.allowed)
            return false;
        // Check allowed hosts
        if (rule.allowedHosts) {
            if (!rule.allowedHosts.includes(host)) {
                return false;
            }
        }
        // Check write permission for non-GET methods
        const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        if (isWrite && !rule.allowWrite) {
            return false;
        }
        return true;
    }
    requiresApproval(id) {
        const rule = this.rules.get(id);
        return !!rule && !!rule.requiresApproval;
    }
    getMaxDuration(id) {
        const rule = this.rules.get(id);
        return rule?.maxDurationMs;
    }
}
export const createDefaultSecurityPolicy = () => {
    return new WaylandSecurityPolicy({
        tools: [
            {
                id: 'shell',
                name: 'Shell Command Executor',
                allowed: true,
                maxDurationMs: 30000,
                allowedPaths: ['/workspace', '/tmp'],
                allowedCommands: ['echo', 'ls', 'cat', 'grep', 'find'],
                allowWrite: true,
                requiresApproval: false,
            },
            {
                id: 'file',
                name: 'File System Operations',
                allowed: true,
                maxDurationMs: 10000,
                allowedPaths: ['/workspace'],
                allowWrite: true,
                requiresApproval: false,
            },
            {
                id: 'http',
                name: 'HTTP Client',
                allowed: true,
                maxDurationMs: 30000,
                allowedHosts: [
                    'api.internal',
                    'localhost',
                    '127.0.0.1',
                    'localhost:7001',
                    '127.0.0.1:7001',
                ],
                allowWrite: true,
                requiresApproval: false,
            },
            {
                id: 'model',
                name: 'Language Model Invocation',
                allowed: true,
                maxDurationMs: 60000,
                allowWrite: false,
                requiresApproval: false,
            },
        ],
    });
};
//# sourceMappingURL=wayland-security-policy.js.map