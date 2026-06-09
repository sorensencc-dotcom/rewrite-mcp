import { FileAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
import { SecurityViolationError } from './WaylandShellAdapter';

export class WaylandFileAdapter implements FileAdapter {
  constructor(
    private policy: SecurityPolicy,
    private memory?: MemoryStore
  ) {}

  async read(path: string): Promise<string> {
    // Enforce path security
    const enforcement = this.policy.enforceFilePath(path, false);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'file',
          `read:${path}`,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `File read blocked: ${enforcement.reason}`);
    }

    // Log allowed read
    if (this.memory) {
      this.memory.writeAdapterCall('file', `read:${path}`, 'success', 0);
    }

    // Mock file read
    return `Content of ${path}`;
  }

  async write(path: string, content: string): Promise<void> {
    // Enforce path security (write=true)
    const enforcement = this.policy.enforceFilePath(path, true);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'file',
          `write:${path}`,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `File write blocked: ${enforcement.reason}`);
    }

    // Log allowed write
    if (this.memory) {
      this.memory.writeAdapterCall('file', `write:${path}`, 'success', 0, {
        contentLength: content.length,
      });
    }

    // Mock file write
  }

  async list(path: string): Promise<{ name: string; type: 'file' | 'dir' }[]> {
    // Enforce path security
    const enforcement = this.policy.enforceFilePath(path, false);
    if (!enforcement.allowed) {
      if (this.memory && enforcement.signal) {
        this.memory.writeGovernanceSignal(
          enforcement.signal.signalId,
          'file',
          `list:${path}`,
          enforcement.signal.severity,
          true,
          enforcement.reason
        );
      }
      throw new SecurityViolationError(enforcement.signal, `File list blocked: ${enforcement.reason}`);
    }

    // Log allowed list
    if (this.memory) {
      this.memory.writeAdapterCall('file', `list:${path}`, 'success', 0);
    }

    // Mock directory listing
    return [
      { name: 'file1.txt', type: 'file' },
      { name: 'subdir', type: 'dir' },
    ];
  }
}
