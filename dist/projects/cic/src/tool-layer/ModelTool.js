"use strict";
/**
 * ModelTool — LLM model calls with pluggable backend
 * Direct mode: Anthropic SDK with API key from ANTHROPIC_API_KEY env
 * Wayland mode: POST to Wayland tool endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelTool = void 0;
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
class ModelTool {
    constructor(mode = "direct", waylandEndpoint) {
        this.mode = mode;
        this.waylandEndpoint = waylandEndpoint;
        this.defaultModel =
            process.env.LLM_MODEL || "claude-sonnet-4-6";
    }
    async generate(input) {
        if (this.mode === "wayland") {
            return this.generateWayland(input);
        }
        return this.generateDirect(input);
    }
    async generateDirect(input) {
        const { prompt, max_tokens, temperature = 0.7 } = input;
        const model = input.model_id || this.defaultModel;
        // Lazy load Anthropic SDK
        let Anthropic;
        try {
            Anthropic = require("@anthropic-ai/sdk").default;
        }
        catch {
            throw new Error("ADAPTER_ERROR: Anthropic SDK not installed");
        }
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error("ADAPTER_ERROR: ANTHROPIC_API_KEY not configured");
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
            const text = response.content[0].type === "text"
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
        }
        catch (err) {
            throw new Error(`ADAPTER_ERROR: Model call failed: ${err.message}`);
        }
    }
    async generateWayland(input) {
        if (!this.waylandEndpoint) {
            throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
        }
        const requestId = (0, uuid_1.v4)();
        const request = {
            id: requestId,
            kind: "model",
            payload: input,
            timeout_ms: 120000,
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
}
exports.ModelTool = ModelTool;
//# sourceMappingURL=ModelTool.js.map