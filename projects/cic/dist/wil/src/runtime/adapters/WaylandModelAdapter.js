import { SecurityViolationError } from './WaylandShellAdapter';
export class WaylandModelAdapter {
    constructor(policy, memory) {
        this.policy = policy;
        this.memory = memory;
    }
    async invoke(prompt, options) {
        // Enforce model options security
        const enforcement = this.policy.enforceModelOptions(options);
        if (!enforcement.allowed) {
            if (this.memory && enforcement.signal) {
                this.memory.writeGovernanceSignal(enforcement.signal.signalId, 'model', `invoke(${options.maxTokens}tokens,${options.temperature}temp)`, enforcement.signal.severity, true, enforcement.reason);
            }
            throw new SecurityViolationError(enforcement.signal, `Model invocation blocked: ${enforcement.reason}`);
        }
        // Log allowed invocation
        if (this.memory) {
            this.memory.writeAdapterCall('model', 'invoke', 'success', 0, {
                promptLength: prompt.length,
                maxTokens: options.maxTokens,
                temperature: options.temperature,
            });
        }
        // Mock model invocation
        return {
            text: `Model response to: "${prompt.substring(0, 50)}..."`,
        };
    }
}
//# sourceMappingURL=WaylandModelAdapter.js.map