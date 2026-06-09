import { HttpAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
import { SecurityViolationError } from './WaylandShellAdapter';

export class WaylandHttpAdapter implements HttpAdapter {
  constructor(
    private policy: SecurityPolicy,
    private memory?: MemoryStore
  ) {}

  async get(url: string): Promise<{ status: number; body: string }> {
    // Enforce domain security
    const enforcement = this.policy.enforceHttpDomain(url);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'http',
          `GET:${url}`,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `HTTP GET blocked: ${enforcement.reason}`);
    }

    // Log allowed GET
    if (this.memory) {
      this.memory.writeAdapterCall('http', `GET:${url}`, 'success', 0);
    }

    // Mock HTTP GET
    return {
      status: 200,
      body: `Response from ${url}`,
    };
  }

  async post(url: string, body: any): Promise<{ status: number; body: string }> {
    // Enforce domain security
    const enforcement = this.policy.enforceHttpDomain(url);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'http',
          `POST:${url}`,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `HTTP POST blocked: ${enforcement.reason}`);
    }

    // Log allowed POST
    if (this.memory) {
      this.memory.writeAdapterCall('http', `POST:${url}`, 'success', 0, {
        bodySize: JSON.stringify(body).length,
      });
    }

    // Mock HTTP POST
    return {
      status: 200,
      body: `Posted to ${url}`,
    };
  }
}
