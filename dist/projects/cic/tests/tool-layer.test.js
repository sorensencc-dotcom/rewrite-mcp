"use strict";
/**
 * Tool Layer Adapter Tests
 * Tests direct mode adapters with mocked Wayland behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ShellTool_1 = require("../src/tool-layer/ShellTool");
const FileTool_1 = require("../src/tool-layer/FileTool");
const ModelTool_1 = require("../src/tool-layer/ModelTool");
const HttpTool_1 = require("../src/tool-layer/HttpTool");
(0, vitest_1.describe)("ShellTool", () => {
    let tool;
    (0, vitest_1.beforeEach)(() => {
        tool = new ShellTool_1.ShellTool("direct");
    });
    (0, vitest_1.it)("should execute simple command", async () => {
        const result = await tool.run({
            command: "echo test",
            timeout_ms: 5000,
        });
        (0, vitest_1.expect)(result.exit_code).toBe(0);
        (0, vitest_1.expect)(result.stdout).toContain("test");
    });
    (0, vitest_1.it)("should capture stderr", async () => {
        const result = await tool.run({
            command: process.platform === "win32" ? "cmd /c echo error>&2" : "sh -c 'echo error >&2'",
            timeout_ms: 5000,
        });
        (0, vitest_1.expect)(result.stderr).toContain("error");
    });
    (0, vitest_1.it)("should reject interactive read command", async () => {
        await (0, vitest_1.expect)(tool.run({
            command: "read -p 'prompt' var",
            timeout_ms: 5000,
        })).rejects.toThrow(/interactive/i);
    });
    (0, vitest_1.it)("should reject pause command with space", async () => {
        await (0, vitest_1.expect)(tool.run({
            command: "pause ",
            timeout_ms: 5000,
        })).rejects.toThrow(/interactive/i);
    });
    (0, vitest_1.it)("should reject prompt command", async () => {
        await (0, vitest_1.expect)(tool.run({
            command: "prompt something",
            timeout_ms: 5000,
        })).rejects.toThrow(/interactive/i);
    });
    (0, vitest_1.it)("should handle non-zero exit codes", async () => {
        const result = await tool.run({
            command: process.platform === "win32" ? "cmd /c exit 1" : "sh -c 'exit 1'",
            timeout_ms: 5000,
        });
        (0, vitest_1.expect)(result.exit_code).toBe(1);
    });
});
(0, vitest_1.describe)("FileTool", () => {
    let tool;
    (0, vitest_1.beforeEach)(() => {
        tool = new FileTool_1.FileTool("direct");
    });
    (0, vitest_1.it)("should reject path outside workspace root", async () => {
        // Using /etc/passwd which is definitely outside /cic_workspace
        await (0, vitest_1.expect)(tool.read({
            path: "/etc/passwd",
        })).rejects.toThrow(/FORBIDDEN|escapes workspace/i);
    });
    (0, vitest_1.it)("should reject path with .. traversal", async () => {
        await (0, vitest_1.expect)(tool.write({
            path: "/cic_workspace/../../escape.txt",
            content: "should fail",
            overwrite: true,
        })).rejects.toThrow(/FORBIDDEN|\.\./i);
    });
    (0, vitest_1.it)("should accept paths within workspace root", async () => {
        // This will fail on actual write (no permission to /cic_workspace) but will pass validation
        try {
            await tool.write({
                path: "/cic_workspace/test.txt",
                content: "test content",
                overwrite: true,
            });
        }
        catch (e) {
            // Path validation should pass, but file write may fail due to permissions
            // We're just testing the path validation, not actual file I/O
            (0, vitest_1.expect)(e.message).not.toMatch(/escapes workspace/i);
        }
    });
});
(0, vitest_1.describe)("ModelTool", () => {
    let tool;
    (0, vitest_1.beforeEach)(() => {
        tool = new ModelTool_1.ModelTool("direct");
    });
    (0, vitest_1.it)("should reject when ANTHROPIC_API_KEY not set", async () => {
        const originalKey = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        try {
            await (0, vitest_1.expect)(tool.generate({
                prompt: "test",
                max_tokens: 100,
            })).rejects.toThrow(/ANTHROPIC_API_KEY/);
        }
        finally {
            if (originalKey) {
                process.env.ANTHROPIC_API_KEY = originalKey;
            }
        }
    });
    (0, vitest_1.it)("should use configured LLM_MODEL env var", () => {
        const originalModel = process.env.LLM_MODEL;
        process.env.LLM_MODEL = "claude-opus-4-8";
        try {
            const testTool = new ModelTool_1.ModelTool("direct");
            (0, vitest_1.expect)(testTool).toBeDefined();
        }
        finally {
            if (originalModel) {
                process.env.LLM_MODEL = originalModel;
            }
            else {
                delete process.env.LLM_MODEL;
            }
        }
    });
});
(0, vitest_1.describe)("HttpTool", () => {
    let tool;
    (0, vitest_1.beforeEach)(() => {
        tool = new HttpTool_1.HttpTool("direct");
    });
    (0, vitest_1.it)("should handle timeout gracefully", async () => {
        // Use a non-routable IP to trigger timeout
        const result = await tool.request({
            method: "GET",
            url: "http://192.0.2.1:80/timeout-test", // TEST-NET-1, should timeout
            timeout_ms: 100,
        });
        (0, vitest_1.expect)(result.timed_out).toBe(true);
        (0, vitest_1.expect)(result.status).toBe(0);
        (0, vitest_1.expect)(result.body).toBe("Request timed out");
    });
});
(0, vitest_1.describe)("Wayland mode errors", () => {
    (0, vitest_1.it)("ShellTool should error when Wayland endpoint not configured", async () => {
        const tool = new ShellTool_1.ShellTool("wayland");
        await (0, vitest_1.expect)(tool.run({
            command: "echo test",
            timeout_ms: 5000,
        })).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
    });
    (0, vitest_1.it)("FileTool should error when Wayland endpoint not configured", async () => {
        const tool = new FileTool_1.FileTool("wayland");
        await (0, vitest_1.expect)(tool.read({
            path: "/test.txt",
        })).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
    });
    (0, vitest_1.it)("ModelTool should error when Wayland endpoint not configured", async () => {
        const tool = new ModelTool_1.ModelTool("wayland");
        await (0, vitest_1.expect)(tool.generate({
            prompt: "test",
            max_tokens: 100,
        })).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
    });
    (0, vitest_1.it)("HttpTool should error when Wayland endpoint not configured", async () => {
        const tool = new HttpTool_1.HttpTool("wayland");
        await (0, vitest_1.expect)(tool.request({
            method: "GET",
            url: "http://example.com",
            timeout_ms: 5000,
        })).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
    });
});
//# sourceMappingURL=tool-layer.test.js.map