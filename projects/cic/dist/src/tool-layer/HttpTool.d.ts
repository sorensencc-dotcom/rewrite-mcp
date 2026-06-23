/**
 * HttpTool — Make HTTP requests
 * Direct mode: native fetch() with AbortController timeout
 * Wayland mode: POST to Wayland tool endpoint
 */
import { ToolMode } from "./ToolLayer";
import { HttpInput, HttpOutput } from "./types";
export declare class HttpTool {
    private mode;
    private waylandEndpoint?;
    constructor(mode?: ToolMode, waylandEndpoint?: string);
    request(input: HttpInput): Promise<HttpOutput>;
    private requestDirect;
    private requestWayland;
}
