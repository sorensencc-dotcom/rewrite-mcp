"use strict";
/**
 * HttpTool — Make HTTP requests
 * Direct mode: native fetch() with AbortController timeout
 * Wayland mode: POST to Wayland tool endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTool = void 0;
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
class HttpTool {
    constructor(mode = "direct", waylandEndpoint) {
        this.mode = mode;
        this.waylandEndpoint = waylandEndpoint;
    }
    async request(input) {
        if (this.mode === "wayland") {
            return this.requestWayland(input);
        }
        return this.requestDirect(input);
    }
    async requestDirect(input) {
        const { method, url, headers = {}, body, timeout_ms = 15000 } = input;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout_ms);
        try {
            const options = {
                method,
                headers,
                signal: controller.signal,
            };
            if (body) {
                options.body = body;
            }
            const response = await (0, node_fetch_1.default)(url, options);
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            const responseBody = await response.text();
            return {
                status: response.status,
                headers: responseHeaders,
                body: responseBody,
                timed_out: false,
            };
        }
        catch (err) {
            if (err.name === "AbortError") {
                return {
                    status: 0,
                    headers: {},
                    body: "Request timed out",
                    timed_out: true,
                };
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async requestWayland(input) {
        if (!this.waylandEndpoint) {
            throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
        }
        const requestId = (0, uuid_1.v4)();
        const request = {
            id: requestId,
            kind: "http",
            payload: input,
            timeout_ms: input.timeout_ms || 15000,
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
exports.HttpTool = HttpTool;
//# sourceMappingURL=HttpTool.js.map