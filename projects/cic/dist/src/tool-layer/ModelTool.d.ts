/**
 * ModelTool — LLM model calls with pluggable backend
 * Direct mode: Anthropic SDK with API key from ANTHROPIC_API_KEY env
 * Wayland mode: POST to Wayland tool endpoint
 */
import { ToolMode } from "./ToolLayer";
import { ModelInput, ModelOutput } from "./types";
export declare class ModelTool {
    private mode;
    private waylandEndpoint?;
    private defaultModel;
    constructor(mode?: ToolMode, waylandEndpoint?: string);
    generate(input: ModelInput): Promise<ModelOutput>;
    private generateDirect;
    private generateWayland;
}
