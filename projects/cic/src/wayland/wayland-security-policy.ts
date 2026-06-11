// filename: wayland-security-policy.ts
// Wayland Security Policy
// Governance rules for tool execution with fine-grained permissions

export interface ToolRule {
  id: string;
  name: string;
  allowed: boolean;
  maxDurationMs?: number;
  allowedPaths?: string[];
  allowedHosts?: string[];
  allowedCommands?: string[];
  allowWrite?: boolean;
  requiresApproval?: boolean;
}

export interface SecurityPolicyConfig {
  tools: ToolRule[];
}

export class WaylandSecurityPolicy {
  private readonly rules = new Map<string, ToolRule>();

  constructor(cfg: SecurityPolicyConfig) {
    for (const rule of cfg.tools) {
      this.rules.set(rule.id, rule);
    }
  }

  isToolAllowed(id: string): boolean {
    const rule = this.rules.get(id);
    return !!rule && rule.allowed;
  }

  getToolRule(id: string): ToolRule | undefined {
    return this.rules.get(id);
  }

  validateShellCommand(id: string, command: string, workingDir: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.allowed) return false;

    // Check allowed commands (empty list = deny all)
    if (rule.allowedCommands && rule.allowedCommands.length > 0) {
      const cmdName = command.split(/\s+/)[0];
      if (!rule.allowedCommands.includes(cmdName)) {
        return false;
      }
    } else if (rule.allowedCommands !== undefined) {
      // allowedCommands explicitly set to empty = deny all commands
      return false;
    }

    // Check working directory (prevent /work matching /workspace)
    if (rule.allowedPaths) {
      const isAllowed = rule.allowedPaths.some(p =>
        workingDir === p || workingDir.startsWith(p + '/')
      );
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  }

  validateFileOperation(
    id: string,
    operation: 'read' | 'write' | 'delete',
    path: string
  ): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.allowed) return false;

    // Check write permission
    if (operation !== 'read' && !rule.allowWrite) {
      return false;
    }

    // Check path restrictions (prevent /work matching /workspace)
    if (rule.allowedPaths) {
      const isAllowed = rule.allowedPaths.some(p =>
        path === p || path.startsWith(p + '/')
      );
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  }

  validateHttpRequest(id: string, host: string, method: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.allowed) return false;

    // Check allowed hosts
    if (rule.allowedHosts) {
      if (!rule.allowedHosts.includes(host)) {
        return false;
      }
    }

    // Check write permission for non-GET methods
    const writeMethods = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
    const isWrite = writeMethods.has(method);
    if (isWrite && !rule.allowWrite) {
      return false;
    }

    return true;
  }

  requiresApproval(id: string): boolean {
    const rule = this.rules.get(id);
    return !!rule && !!rule.requiresApproval;
  }

  getMaxDuration(id: string): number | undefined {
    const rule = this.rules.get(id);
    return rule?.maxDurationMs;
  }
}

export const createDefaultSecurityPolicy = (): WaylandSecurityPolicy => {
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
