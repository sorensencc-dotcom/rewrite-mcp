/**
 * HttpTool — Make HTTP requests
 * Direct mode: native fetch() with AbortController timeout
 * Wayland mode: POST to Wayland tool endpoint
 */

import { ToolMode } from "./ToolLayer";
import { ToolRequest, ToolResponse, HttpInput, HttpOutput } from "./types";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

export class HttpTool {
  private mode: ToolMode;
  private waylandEndpoint?: string;

  constructor(mode: ToolMode = "direct", waylandEndpoint?: string) {
    this.mode = mode;
    this.waylandEndpoint = waylandEndpoint;
  }

  async request(input: HttpInput): Promise<HttpOutput> {
    if (this.mode === "wayland") {
      return this.requestWayland(input);
    }
    return this.requestDirect(input);
  }

  private async requestDirect(input: HttpInput): Promise<HttpOutput> {
    const { method, url, headers = {}, body, timeout_ms = 15000 } = input;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    try {
      const options: any = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body) {
        options.body = body;
      }

      const response = await fetch(url, options);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        responseHeaders[key] = value;
      });

      const responseBody = await response.text();

      return {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
        timed_out: false,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          status: 0,
          headers: {},
          body: "Request timed out",
          timed_out: true,
        };
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async requestWayland(input: HttpInput): Promise<HttpOutput> {
    if (!this.waylandEndpoint) {
      throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
    }

    const requestId = uuidv4();
    const request: ToolRequest = {
      id: requestId,
      kind: "http",
      payload: input,
      timeout_ms: input.timeout_ms || 15000,
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

      const data = (await response.json()) as ToolResponse<HttpOutput>;

      if (!data.success) {
        throw new Error(`${data.error?.code}: ${data.error?.message}`);
      }

      return data.payload!;
    } catch (err: any) {
      throw new Error(`ADAPTER_ERROR: ${err.message}`);
    }
  }
}
