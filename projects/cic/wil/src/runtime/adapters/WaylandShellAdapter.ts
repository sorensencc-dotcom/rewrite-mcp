import { ShellAdapter } from './index';
import { SecurityPolicy, EnforcementResult } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';

export class SecurityViolationError extends Error {
  constructor(
    public signal: any,
    message: string
  ) {
    super(message);
    this.name = 'SecurityViolationError';
  }
}

export class WaylandShellAdapter implements ShellAdapter {
  constructor(
    private policy: SecurityPolicy,
    private memory?: MemoryStore
  ) {}

  async execute(
    command: string,
    args: string[],
    options?: { timeoutMs?: number }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const fullCommand = [command, ...args].join(' ');

    // Enforce security policy
    const enforcement = this.policy.enforceShell(fullCommand);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'shell',
          fullCommand,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `Shell command blocked: ${enforcement.reason}`);
    }

    // Log allowed execution
    if (this.memory && enforcement.signal) {
      this.memory.writeAdapterCall('shell', fullCommand, 'success', 0, {
        args,
        timeout: options?.timeoutMs,
      });
    }

    // Mock execution (in production, would call actual shell)
    return {
      stdout: `Executed: ${fullCommand}`,
      stderr: '',
      exitCode: 0,
    };
  }
}
