// File: projects/cic/ingestion/tests/headroom.test.js | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mcp } from "../src/lib/mcpClient.js";
import { chat as baseChat } from "../src/lib/llmClient.js";
import {
  headroomCompressMessages,
  headroomRetrieveOriginal
} from "../src/lib/headroomClient.js";
import { chatWithHeadroom } from "../src/lib/llmClientWithHeadroom.js";

// Mock the dependencies
vi.mock("../src/lib/mcpClient.js", () => {
  return {
    mcp: {
      call: vi.fn()
    }
  };
});

vi.mock("../src/lib/llmClient.js", () => {
  return {
    chat: vi.fn()
  };
});

describe("Headroom Integration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.HEADROOM_ENABLED = "true";
    process.env.HEADROOM_MCP_ENABLED = "true";
    process.env.HEADROOM_ON_MCP_FAILURE = "bypass";
    process.env.HEADROOM_ON_AUTH_FAILURE = "bypass";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("headroomCompressMessages", () => {
    it("should compress messages successfully when MCP server returns compressed output", async () => {
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      const compressed = [{ role: "user", content: "Hello" }];
      
      mcp.call.mockResolvedValueOnce({ compressed });

      const result = await headroomCompressMessages(messages);
      
      expect(mcp.call).toHaveBeenCalledWith("headroom", "headroom_compress", { messages });
      expect(result).toEqual(compressed);
    });

    it("should bypass and return original messages when HEADROOM_ENABLED is false", async () => {
      process.env.HEADROOM_ENABLED = "false";
      const messages = [{ role: "user", content: "Hello Headroom!" }];

      const result = await headroomCompressMessages(messages);
      
      expect(mcp.call).not.toHaveBeenCalled();
      expect(result).toEqual(messages);
    });

    it("should bypass and return original messages when MCP server call fails with general error", async () => {
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      mcp.call.mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await headroomCompressMessages(messages);
      
      expect(result).toEqual(messages);
    });

    it("should propagate general error when HEADROOM_ON_MCP_FAILURE is set to fail", async () => {
      process.env.HEADROOM_ON_MCP_FAILURE = "fail";
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      mcp.call.mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(headroomCompressMessages(messages)).rejects.toThrow("Connection timeout");
    });

    it("should bypass and return original messages when MCP server call fails with auth error", async () => {
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      const authError = new Error("401 Unauthorized");
      authError.statusCode = 401;
      mcp.call.mockRejectedValueOnce(authError);

      const result = await headroomCompressMessages(messages);
      
      expect(result).toEqual(messages);
    });

    it("should propagate auth error when HEADROOM_ON_AUTH_FAILURE is set to fail", async () => {
      process.env.HEADROOM_ON_AUTH_FAILURE = "fail";
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      const authError = new Error("401 Unauthorized");
      authError.statusCode = 401;
      mcp.call.mockRejectedValueOnce(authError);

      await expect(headroomCompressMessages(messages)).rejects.toThrow("401 Unauthorized");
    });
  });

  describe("headroomRetrieveOriginal", () => {
    it("should retrieve original context", async () => {
      const original = [{ role: "user", content: "Hello Headroom!" }];
      mcp.call.mockResolvedValueOnce({ original });

      const result = await headroomRetrieveOriginal("id-123");
      
      expect(mcp.call).toHaveBeenCalledWith("headroom", "headroom_retrieve", { id: "id-123" });
      expect(result).toEqual(original);
    });
  });

  describe("chatWithHeadroom", () => {
    it("should call baseChat with compressed messages", async () => {
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      const compressed = [{ role: "user", content: "Hello" }];
      const mockResult = { text: "Mocked LLM Response" };

      mcp.call.mockResolvedValueOnce({ compressed });
      baseChat.mockResolvedValueOnce(mockResult);

      const result = await chatWithHeadroom(messages, { model: "claude-3" });

      expect(baseChat).toHaveBeenCalledWith(compressed, { model: "claude-3" });
      expect(result).toEqual(mockResult);
    });

    it("should fall back to original messages on compression failure", async () => {
      const messages = [{ role: "user", content: "Hello Headroom!" }];
      const mockResult = { text: "Mocked LLM Response" };

      mcp.call.mockRejectedValueOnce(new Error("Compression failed"));
      baseChat.mockResolvedValueOnce(mockResult);

      const result = await chatWithHeadroom(messages, { model: "claude-3" });

      expect(baseChat).toHaveBeenCalledWith(messages, { model: "claude-3" });
      expect(result).toEqual(mockResult);
    });
  });
});
