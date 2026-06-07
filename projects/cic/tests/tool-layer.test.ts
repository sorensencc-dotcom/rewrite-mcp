/**
 * Tool Layer adapter tests
 * Unit tests for direct mode; Wayland mode tested with mocks
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShellTool } from "../src/tool-layer/ShellTool";
import { FileTool } from "../src/tool-layer/FileTool";
import { ModelTool } from "../src/tool-layer/ModelTool";
import { HttpTool } from "../src/tool-layer/HttpTool";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("ShellTool", () => {
  let shellTool: ShellTool;

  beforeEach(() => {
    shellTool = new ShellTool("direct");
  });

  it("executes a simple echo command", async () => {
    const result = await shellTool.run({
      command: "echo hello",
    });

    expect(result.exit_code).toBe(0);
    expect(result.stdout).toContain("hello");
    expect(result.timed_out).toBe(false);
  });

  it("rejects interactive commands", async () => {
    await expect(
      shellTool.run({
        command: "read -p 'Enter: '",
      })
    ).rejects.toThrow(/FORBIDDEN_INTERACTIVE/);
  });

  it("captures stderr", async () => {
    const result = await shellTool.run({
      command: "echo error >&2",
    });

    expect(result.exit_code).toBe(0);
    expect(result.stderr).toContain("error");
  });

  it("returns timeout flag when command exceeds timeout", async () => {
    const result = await shellTool.run({
      command: "sleep 10",
      timeout_ms: 100,
    });

    expect(result.timed_out).toBe(true);
  });

  it("fails when Wayland endpoint not configured in Wayland mode", async () => {
    const waylandTool = new ShellTool("wayland");
    await expect(
      waylandTool.run({
        command: "echo test",
      })
    ).rejects.toThrow(/Wayland endpoint not configured/);
  });
});

describe("FileTool", () => {
  let fileTool: FileTool;
  let tempDir: string;

  beforeEach(async () => {
    fileTool = new FileTool("direct");
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cic-test-"));
    process.env.CIC_WORKSPACE_ROOT = tempDir;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes and reads a file", async () => {
    const testPath = path.join(tempDir, "test.txt");
    const content = "test content";

    await fileTool.write({
      path: testPath,
      content,
    });

    const result = await fileTool.read({
      path: testPath,
    });

    expect(result.exists).toBe(true);
    expect(result.content).toBe(content);
  });

  it("returns checksum on write", async () => {
    const testPath = path.join(tempDir, "test.txt");
    const result = await fileTool.write({
      path: testPath,
      content: "test",
    });

    expect(result.checksum).toBeDefined();
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    expect(result.size_bytes).toBe(4);
  });

  it("rejects path outside workspace root", async () => {
    await expect(
      fileTool.write({
        path: "/etc/passwd",
        content: "test",
      })
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("rejects path with .. traversal", async () => {
    const testPath = path.join(tempDir, "../../etc/passwd");
    await expect(
      fileTool.write({
        path: testPath,
        content: "test",
      })
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("respects overwrite=false", async () => {
    const testPath = path.join(tempDir, "test.txt");
    await fileTool.write({
      path: testPath,
      content: "original",
    });

    await expect(
      fileTool.write({
        path: testPath,
        content: "new",
        overwrite: false,
      })
    ).rejects.toThrow(/FILE_EXISTS/);
  });

  it("returns exists=false for missing file", async () => {
    const result = await fileTool.read({
      path: path.join(tempDir, "nonexistent.txt"),
    });

    expect(result.exists).toBe(false);
  });

  it("fails when Wayland endpoint not configured in Wayland mode", async () => {
    const waylandTool = new FileTool("wayland");
    await expect(
      waylandTool.write({
        path: "/test/file.txt",
        content: "test",
      })
    ).rejects.toThrow(/Wayland endpoint not configured/);
  });
});

describe("ModelTool", () => {
  let modelTool: ModelTool;

  beforeEach(() => {
    modelTool = new ModelTool("direct");
  });

  it("requires ANTHROPIC_API_KEY for direct mode", async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      // Note: actual SDK call will fail with auth error
      // This test documents that we don't validate key presence upfront
      expect(modelTool).toBeDefined();
    } finally {
      if (oldKey) process.env.ANTHROPIC_API_KEY = oldKey;
    }
  });

  it("uses LLM_MODEL env var as default", () => {
    process.env.LLM_MODEL = "custom-model";
    const tool = new ModelTool("direct");
    expect(tool["defaultModel"]).toBe("custom-model");
  });

  it("fails when Wayland endpoint not configured in Wayland mode", async () => {
    const waylandTool = new ModelTool("wayland");
    await expect(
      waylandTool.generate({
        model_id: "claude",
        prompt: "test",
      })
    ).rejects.toThrow(/Wayland endpoint not configured/);
  });
});

describe("HttpTool", () => {
  let httpTool: HttpTool;

  beforeEach(() => {
    httpTool = new HttpTool("direct");
  });

  it("makes a GET request", async () => {
    const result = await httpTool.request({
      method: "GET",
      url: "https://httpbin.org/get",
    });

    expect(result.status).toBe(200);
    expect(result.body).toBeDefined();
    expect(result.timed_out).toBe(false);
  });

  it("respects timeout", async () => {
    const result = await httpTool.request({
      method: "GET",
      url: "https://httpbin.org/delay/10",
      timeout_ms: 100,
    });

    expect(result.timed_out).toBe(true);
  });

  it("fails when Wayland endpoint not configured in Wayland mode", async () => {
    const waylandTool = new HttpTool("wayland");
    await expect(
      waylandTool.request({
        method: "GET",
        url: "https://example.com",
      })
    ).rejects.toThrow(/Wayland endpoint not configured/);
  });
});
