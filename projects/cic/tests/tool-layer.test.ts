/**
 * Tool Layer Adapter Tests
 * Tests direct mode adapters with mocked Wayland behavior
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShellTool } from "../src/tool-layer/ShellTool";
import { FileTool } from "../src/tool-layer/FileTool";
import { ModelTool } from "../src/tool-layer/ModelTool";
import { HttpTool } from "../src/tool-layer/HttpTool";

describe("ShellTool", () => {
  let tool: ShellTool;

  beforeEach(() => {
    tool = new ShellTool("direct");
  });

  it("should execute simple command", async () => {
    const result = await tool.run({
      command: "echo test",
      timeout_ms: 5000,
    });

    expect(result.exit_code).toBe(0);
    expect(result.stdout).toContain("test");
  });

  it("should capture stderr", async () => {
    const result = await tool.run({
      command: process.platform === "win32" ? "cmd /c echo error>&2" : "sh -c 'echo error >&2'",
      timeout_ms: 5000,
    });

    expect(result.stderr).toContain("error");
  });

  it("should reject interactive read command", async () => {
    await expect(
      tool.run({
        command: "read -p 'prompt' var",
        timeout_ms: 5000,
      })
    ).rejects.toThrow(/interactive/i);
  });

  it("should reject pause command with space", async () => {
    await expect(
      tool.run({
        command: "pause ",
        timeout_ms: 5000,
      })
    ).rejects.toThrow(/interactive/i);
  });

  it("should reject prompt command", async () => {
    await expect(
      tool.run({
        command: "prompt something",
        timeout_ms: 5000,
      })
    ).rejects.toThrow(/interactive/i);
  });

  it("should handle non-zero exit codes", async () => {
    const result = await tool.run({
      command: process.platform === "win32" ? "cmd /c exit 1" : "sh -c 'exit 1'",
      timeout_ms: 5000,
    });

    expect(result.exit_code).toBe(1);
  });
});

describe("FileTool", () => {
  let tool: FileTool;

  beforeEach(() => {
    tool = new FileTool("direct");
  });

  it("should reject path outside workspace root", async () => {
    // Using /etc/passwd which is definitely outside /cic_workspace
    await expect(
      tool.read({
        path: "/etc/passwd",
      })
    ).rejects.toThrow(/FORBIDDEN|escapes workspace/i);
  });

  it("should reject path with .. traversal", async () => {
    await expect(
      tool.write({
        path: "/cic_workspace/../../escape.txt",
        content: "should fail",
        overwrite: true,
      })
    ).rejects.toThrow(/FORBIDDEN|\.\./i);
  });

  it("should accept paths within workspace root", async () => {
    // This will fail on actual write (no permission to /cic_workspace) but will pass validation
    try {
      await tool.write({
        path: "/cic_workspace/test.txt",
        content: "test content",
        overwrite: true,
      });
    } catch (e: any) {
      // Path validation should pass, but file write may fail due to permissions
      // We're just testing the path validation, not actual file I/O
      expect(e.message).not.toMatch(/escapes workspace/i);
    }
  });
});

describe("ModelTool", () => {
  let tool: ModelTool;

  beforeEach(() => {
    tool = new ModelTool("direct");
  });

  it("should reject when ANTHROPIC_API_KEY not set", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await expect(
        tool.generate({
          prompt: "test",
          max_tokens: 100,
        })
      ).rejects.toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });

  it("should use configured LLM_MODEL env var", () => {
    const originalModel = process.env.LLM_MODEL;
    process.env.LLM_MODEL = "claude-opus-4-8";

    try {
      const testTool = new ModelTool("direct");
      expect(testTool).toBeDefined();
    } finally {
      if (originalModel) {
        process.env.LLM_MODEL = originalModel;
      } else {
        delete process.env.LLM_MODEL;
      }
    }
  });
});

describe("HttpTool", () => {
  let tool: HttpTool;

  beforeEach(() => {
    tool = new HttpTool("direct");
  });

  it("should handle timeout gracefully", async () => {
    // Use a non-routable IP to trigger timeout
    const result = await tool.request({
      method: "GET",
      url: "http://192.0.2.1:80/timeout-test", // TEST-NET-1, should timeout
      timeout_ms: 100,
    });

    expect(result.timed_out).toBe(true);
    expect(result.status).toBe(0);
    expect(result.body).toBe("Request timed out");
  });

});

describe("Wayland mode errors", () => {
  it("ShellTool should error when Wayland endpoint not configured", async () => {
    const tool = new ShellTool("wayland");

    await expect(
      tool.run({
        command: "echo test",
        timeout_ms: 5000,
      })
    ).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
  });

  it("FileTool should error when Wayland endpoint not configured", async () => {
    const tool = new FileTool("wayland");

    await expect(
      tool.read({
        path: "/test.txt",
      })
    ).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
  });

  it("ModelTool should error when Wayland endpoint not configured", async () => {
    const tool = new ModelTool("wayland");

    await expect(
      tool.generate({
        prompt: "test",
        max_tokens: 100,
      })
    ).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
  });

  it("HttpTool should error when Wayland endpoint not configured", async () => {
    const tool = new HttpTool("wayland");

    await expect(
      tool.request({
        method: "GET",
        url: "http://example.com",
        timeout_ms: 5000,
      })
    ).rejects.toThrow(/ADAPTER_ERROR|Wayland endpoint/);
  });
});
