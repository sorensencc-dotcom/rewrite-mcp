/**
 * WaylandShellAdapter — Map Wayland shell tool → CIC pipeline
 * Enforces command allowlist, timeouts, logging to MLA
 */

const { execSync } = require('child_process');

class WaylandShellAdapter {
  constructor() {
    this.allowedCommands = [
      'git',
      'ls',
      'cat',
      'node',
      'npm',
      'echo',
    ];

    this.deniedPatterns = [
      'rm -rf',
      'chmod 777',
      'sudo',
      ':(){:|:&};:',
    ];

    this.timeout = 30000; // 30 seconds default
  }

  /**
   * Execute shell command with safety constraints
   */
  async execute(command, args = [], options = {}) {
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

      const result = {
        exitCode: 0,
        stdout,
        stderr: '',
        command: fullCommand,
        duration,
      };

      console.log(`[ShellAdapter] Success (${duration}ms): ${command}`);
      this.logToPipeline('PIPELINE_RUN', result);

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;

      const result = {
        exitCode: err.status ?? 1,
        stdout: '',
        stderr: err.message,
        command: fullCommand,
        duration,
      };

      console.error(`[ShellAdapter] Error (${duration}ms):`, err.message);
      this.logToPipeline('AGENT_TELEMETRY', result);

      throw err;
    }
  }

  /**
   * Validate command against allowlist and deny patterns
   */
  validateCommand(command, fullCommand) {
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
  logToPipeline(eventType, result) {
    console.log(`[ShellAdapter] → MLA event: ${eventType}`, {
      command: result.command,
      exitCode: result.exitCode,
      duration: result.duration,
    });
  }
}

module.exports = { WaylandShellAdapter };
