"use strict";
/**
 * ShellTool — Execute shell commands with safety validation
 * Direct mode: promisified exec() with timeout via AbortController
 * Wayland mode: POST to Wayland tool endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellTool = void 0;
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ShellTool {
    constructor(mode = "direct", waylandEndpoint) {
        this.mode = mode;
        this.waylandEndpoint = waylandEndpoint;
    }
    async run(input) {
        if (this.mode === "wayland") {
            return this.runWayland(input);
        }
        return this.runDirect(input);
    }
    async runDirect(input) {
        const { command, timeout_ms = 30000 } = input;
        // Validate non-interactive patterns
        this.validateNonInteractive(command);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout_ms);
        try {
            const { stdout, stderr } = await execAsync(command, {
                signal: controller.signal,
            });
            return {
                exit_code: 0,
                stdout,
                stderr,
                timed_out: false,
            };
        }
        catch (err) {
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async runWayland(input) {
        if (!this.waylandEndpoint) {
            throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
        }
        const requestId = (0, uuid_1.v4)();
        const request = {
            id: requestId,
            kind: "shell",
            payload: input,
            timeout_ms: input.timeout_ms || 30000,
        };
        try {
            const response = await (0, node_fetch_1.default)(`${this.waylandEndpoint}/tool`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(`Wayland returned ${response.status}`);
            }
            const data = (await response.json());
            if (!data.success) {
                throw new Error(`${data.error?.code}: ${data.error?.message}`);
            }
            return data.payload;
        }
        catch (err) {
            throw new Error(`ADAPTER_ERROR: ${err.message}`);
        }
    }
    validateNonInteractive(command) {
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
                throw new Error(`FORBIDDEN_INTERACTIVE: Command contains interactive pattern: ${pattern.source}`);
            }
        }
    }
}
exports.ShellTool = ShellTool;
//# sourceMappingURL=ShellTool.js.map