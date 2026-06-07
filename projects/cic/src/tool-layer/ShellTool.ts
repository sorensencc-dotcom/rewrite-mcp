/**
 * ShellTool — Execute shell commands with safety validation
 * Direct mode: promisified exec() with timeout via AbortController
 * Wayland mode: POST to Wayland tool endpoint
 */

import { ToolMode } from "./ToolLayer";
import { ToolRequest, ToolResponse, ShellInput, ShellOutput } from "./types";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ShellTool {
  private mode: ToolMode;
  private waylandEndpoint?: string;

  constructor(mode: ToolMode = "direct", waylandEndpoint?: string) {
    this.mode = mode;
    this.waylandEndpoint = waylandEndpoint;
  }

  async run(input: ShellInput): Promise<ShellOutput> {
    if (this.mode === "wayland") {
      return this.runWayland(input);
    }
    return this.runDirect(input);
  }

  private async runDirect(input: ShellInput): Promise<ShellOutput> {
    const { command, timeout_ms = 30000 } = input;

    // Validate non-interactive patterns
    this.validateNonInteractive(command);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    try {
      const { stdout, stderr } = await execAsync(command, {
        signal: controller.signal as any,
      });

      return {
        exit_code: 0,
        stdout,
        stderr,
        timed_out: false,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          exit_code: 124, // Timeout exit code
          stdout: "",
          stderr: "Command timed out",
          timed_out: true,
        };
      }

      return {
        exit_code: err.code || 1,
        stdout: err.stdout || "",
        stderr: err.stderr || err.message,
        timed_out: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async runWayland(input: ShellInput): Promise<ShellOutput> {
    if (!this.waylandEndpoint) {
      throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
    }

    const requestId = uuidv4();
    const request: ToolRequest = {
      id: requestId,
      kind: "shell",
      payload: input,
      timeout_ms: input.timeout_ms || 30000,
    };

    try {
      const response = await fetch(`${this.waylandEndpoint}/tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Wayland returned ${response.status}`);
      }

      const data = (await response.json()) as ToolResponse<ShellOutput>;

      if (!data.success) {
        throw new Error(`${data.error?.code}: ${data.error?.message}`);
      }

      return data.payload!;
    } catch (err: any) {
      throw new Error(`ADAPTER_ERROR: ${err.message}`);
    }
  }

  private validateNonInteractive(command: string): void {
    // Reject patterns that require user input
    const forbiddenPatterns = [
      /\bread\s/, // bash read command
      /\bpause\s/, // pause command
      /\bprompt\s/, // prompt keyword
      /\$\(read\s/, // command substitution with read
      /\|\s*less/, // pipe to less
      /\|\s*more/, // pipe to more
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(command)) {
        throw new Error(
          `FORBIDDEN_INTERACTIVE: Command contains interactive pattern: ${pattern.source}`
        );
      }
    }
  }
}
