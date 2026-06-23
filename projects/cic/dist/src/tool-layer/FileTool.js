/**
 * FileTool — Read/write files with workspace scoping
 * Direct mode: fs/promises with workspace root validation
 * Wayland mode: POST to Wayland tool endpoint
 */
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import * as fs from "fs/promises";
import * as crypto from "crypto";
import * as path from "path";
const WORKSPACE_ROOT = process.env.CIC_WORKSPACE_ROOT || "/cic_workspace";
function validatePath(filePath) {
    const normalized = path.normalize(filePath);
    // Check if path escapes workspace root
    const resolvedPath = path.resolve(normalized);
    const resolvedWorkspace = path.resolve(WORKSPACE_ROOT);
    if (!resolvedPath.startsWith(resolvedWorkspace)) {
        return {
            valid: false,
            reason: `Path ${filePath} escapes workspace root ${WORKSPACE_ROOT}`,
        };
    }
    // Reject symlink escapes
    if (normalized.includes("..")) {
        return {
            valid: false,
            reason: "Path contains .. traversal",
        };
    }
    return { valid: true };
}
async function computeChecksum(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
}
export class FileTool {
    constructor(mode = "direct", waylandEndpoint) {
        this.mode = mode;
        this.waylandEndpoint = waylandEndpoint;
    }
    async read(input) {
        if (this.mode === "wayland") {
            return this.readWayland(input);
        }
        return this.readDirect(input);
    }
    async write(input) {
        if (this.mode === "wayland") {
            return this.writeWayland(input);
        }
        return this.writeDirect(input);
    }
    async readDirect(input) {
        const { path: filePath } = input;
        const validation = validatePath(filePath);
        if (!validation.valid) {
            throw new Error(`FORBIDDEN: ${validation.reason}`);
        }
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return {
                exists: true,
                content,
                size_bytes: Buffer.byteLength(content, "utf-8"),
                encoding: "utf-8",
            };
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return {
                    exists: false,
                };
            }
            throw err;
        }
    }
    async writeDirect(input) {
        const { path: filePath, content, overwrite = true } = input;
        const validation = validatePath(filePath);
        if (!validation.valid) {
            throw new Error(`FORBIDDEN: ${validation.reason}`);
        }
        // Check if file exists
        if (!overwrite) {
            try {
                await fs.access(filePath);
                throw new Error(`FILE_EXISTS: ${filePath} already exists and overwrite=false`);
            }
            catch (err) {
                if (err.code !== "ENOENT") {
                    throw err;
                }
            }
        }
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        // Write file
        await fs.writeFile(filePath, content, "utf-8");
        // Compute checksum
        const checksum = await computeChecksum(content);
        return {
            path: filePath,
            size_bytes: Buffer.byteLength(content, "utf-8"),
            checksum,
            created_at: new Date().toISOString(),
        };
    }
    async readWayland(input) {
        if (!this.waylandEndpoint) {
            throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
        }
        const requestId = uuidv4();
        const request = {
            id: requestId,
            kind: "file",
            payload: { op: "read", ...input },
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
    async writeWayland(input) {
        if (!this.waylandEndpoint) {
            throw new Error("ADAPTER_ERROR: Wayland endpoint not configured");
        }
        const requestId = uuidv4();
        const request = {
            id: requestId,
            kind: "file",
            payload: { op: "write", ...input },
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
//# sourceMappingURL=FileTool.js.map