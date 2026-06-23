export class SecurityViolationError extends Error {
    constructor(signal, message) {
        super(message);
        this.signal = signal;
        this.name = 'SecurityViolationError';
    }
}
export class WaylandShellAdapter {
    constructor(policy, memory) {
        this.policy = policy;
        this.memory = memory;
    }
    async execute(command, args, options) {
        const fullCommand = [command, ...args].join(' ');
        // Enforce security policy
        const enforcement = this.policy.enforceShell(fullCommand);
        if (!enforcement.allowed) {
            if (this.memory && enforcement.signal) {
                this.memory.writeGovernanceSignal(enforcement.signal.signalId, 'shell', fullCommand, enforcement.signal.severity, true, enforcement.reason);
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
//# sourceMappingURL=WaylandShellAdapter.js.map