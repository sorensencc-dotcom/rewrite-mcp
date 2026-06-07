/**
 * ModelTool — Call LLM models
 * Direct mode: Anthropic SDK (mirrors ingestion/src/clients/modelClient.js)
 * Wayland mode: POST to Wayland tool endpoint
 */

import { ToolMode } from "./ToolLayer";
import { ToolRequest, ToolResponse, ModelInput, ModelOutput } from "./types";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

// Direct mode: Anthropic SDK
let anthropicSdk: any;

async function loadAnthropicSdk() {
  if (!anthropicSdk) {
    const module = await import("@anthropic-ai/sdk");
    anthropicSdk = module.default;
  }
  return anthropicSdk;
}

export class ModelTool {
  private mode: ToolMode;
  private waylandEndpoint?: string;
  private defaultModel: string;

  constructor(mode: ToolMode = "direct", waylandEndpoint?: string) {
    this.mode = mode;
    this.waylandEndpoint = waylandEndpoint;
    this.defaultModel = process.env.LLM_MODEL || "claude-sonnet-4-6";
  }

  async generate(input: ModelInput): Promise<ModelOutput> {
    if (this.mode === "wayland") {
      return this.generateWayland(input);
    }
    return this.generateDirect(input);
  }

  private async generateDirect(input: ModelInput): Promise<ModelOutput> {
    const { model_id, prompt, system_prompt, temperature = 0.2, max_tokens = 4096 } = input;

    const Anthropic = await loadAnthropicSdk();
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
      const response = await client.messages.create({
        model: model_id || this.defaultModel,
        max_tokens,
        temperature,
        system: system_prompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

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
      if (err.status === 401) {
        throw new Error("INVALID_API_KEY: Anthropic API key is invalid or missing");
      }
      if (err.status === 429) {
        throw new Error("RATE_LIMIT: Anthropic API rate limit exceeded");
      }
      throw err;
    }
  }

  private async generateWayland(input: ModelInput): Promise<ModelOutput> {
    if (!this.waylandEndpoint) {
      throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
    }

    const requestId = uuidv4();
    const request: ToolRequest = {
      id: requestId,
      kind: "model",
      payload: {
        ...input,
        model_id: input.model_id || this.defaultModel,
      },
      timeout_ms: 30000,
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
