/**
 * ModelTool — LLM model calls with pluggable backend
 * Direct mode: Anthropic SDK with API key from ANTHROPIC_API_KEY env
 * Wayland mode: POST to Wayland tool endpoint
 */

import { ToolMode } from "./ToolLayer";
import { ToolRequest, ToolResponse, ModelInput, ModelOutput } from "./types";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

export class ModelTool {
  private mode: ToolMode;
  private waylandEndpoint?: string;
  private defaultModel: string;

  constructor(mode: ToolMode = "direct", waylandEndpoint?: string) {
    this.mode = mode;
    this.waylandEndpoint = waylandEndpoint;
    this.defaultModel =
      process.env.LLM_MODEL || "claude-sonnet-4-6";
  }

  async generate(input: ModelInput): Promise<ModelOutput> {
    if (this.mode === "wayland") {
      return this.generateWayland(input);
    }
    return this.generateDirect(input);
  }

  private async generateDirect(input: ModelInput): Promise<ModelOutput> {
    const { prompt, max_tokens, temperature = 0.7 } = input;
    const model = input.model_id || this.defaultModel;

    // Lazy load Anthropic SDK
    let Anthropic: any;
    try {
      Anthropic = require("@anthropic-ai/sdk").default;
    } catch {
      throw new Error(
        "ADAPTER_ERROR: Anthropic SDK not installed"
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ADAPTER_ERROR: ANTHROPIC_API_KEY not configured"
      );
    }

    const client = new Anthropic({ apiKey });

    try {
      const response = await client.messages.create({
        model,
        max_tokens: max_tokens || 1024,
        temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text"
          ? response.content[0].text
          : "";

      return {
        text,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        model_id: response.model,
        stop_reason: response.stop_reason,
      };
    } catch (err: any) {
      throw new Error(
        `ADAPTER_ERROR: Model call failed: ${err.message}`
      );
    }
  }

  private async generateWayland(
    input: ModelInput
  ): Promise<ModelOutput> {
    if (!this.waylandEndpoint) {
      throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
    }

    const requestId = uuidv4();
    const request: ToolRequest = {
      id: requestId,
      kind: "model",
      payload: input,
      timeout_ms: 120000,
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

      const data = (await response.json()) as ToolResponse<ModelOutput>;

      if (!data.success) {
        throw new Error(`${data.error?.code}: ${data.error?.message}`);
      }

      return data.payload!;
    } catch (err: any) {
      throw new Error(`ADAPTER_ERROR: ${err.message}`);
    }
  }
}
