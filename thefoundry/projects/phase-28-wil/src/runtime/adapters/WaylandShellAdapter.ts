/**
 * WaylandShellAdapter — Map Wayland shell tool → CIC pipeline
 * Enforces command allowlist, timeouts, logging to MLA
 */

import { execSync } from 'child_process';

export interface ShellOptions {
  timeout?: number;
  env?: Record<string, string>;
}

export interface ShellResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  duration: number;
}

export class WaylandShellAdapter {
  private allowedCommands = [
    'git',
    'ls',
    'cat',
    'node',
    'npm',
    'tsc',
    'echo',
  ];

  private deniedPatterns = [
    'rm -rf',
    'chmod 777',
    'sudo',
    ':(){:|:&};:',
  ];

  private timeout = 30000; // 30 seconds default

  /**
   * Execute shell command with safety constraints
   */
  async execute(
    command: string,
    args: string[] = [],
    options: ShellOptions = {}
  ): Promise<ShellResult> {
    const fullCommand = [command, ...args].join(' ');
    const startTime = Date.now();

    // Validate command
    this.validateCommand(command, fullCommand);

    try {
      console.log(`[ShellAdapter] Executing: ${fullCommand}`);

      const stdout = execSync(fullCommand, {
        encoding: 'utf-8',
        timeout: options.timeout || this.timeout,
        env: { ...process.env, ...options.env },
      });

      const duration = Date.now() - startTime;

      const result: ShellResult = {
        exitCode: 0,
        stdout,
        stderr: '',
        command: fullCommand,
        duration,
      };

      console.log(`[ShellAdapter] Success (${duration}ms): ${command}`);
      this.logToPipeline('PIPELINE_RUN', result);

      return result;
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const error = err as Error & { stderr?: string; status?: number };

      const result: ShellResult = {
        exitCode: error.status ?? 1,
        stdout: '',
        stderr: error.message,
        command: fullCommand,
        duration,
      };

      console.error(`[ShellAdapter] Error (${duration}ms):`, error.message);
      this.logToPipeline('AGENT_TELEMETRY', result);

      throw error;
    }
  }

  /**
   * Validate command against allowlist and deny patterns
   */
  private validateCommand(command: string, fullCommand: string): void {
    // Check allowlist
    const isAllowed = this.allowedCommands.some((c) => command.startsWith(c));
    if (!isAllowed) {
      throw new Error(
        `[ShellAdapter] Command not in allowlist: ${command}`
      );
    }

    // Check deny patterns
    const isDenied = this.deniedPatterns.some((p) =>
      fullCommand.includes(p)
    );
    if (isDenied) {
      throw new Error(
        `[ShellAdapter] Command matches deny pattern: ${fullCommand}`
      );
    }
  }

  /**
   * Log execution to MLA (stub for Phase 28.4)
   */
  private logToPipeline(eventType: string, result: ShellResult): void {
    console.log(`[ShellAdapter] → MLA event: ${eventType}`, {
      command: result.command,
      exitCode: result.exitCode,
      duration: result.duration,
    });
  }
}
