"use strict";
// File: projects/cic/src/mee/safety/sandbox-engine.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeSandboxEngine = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
class MeeSandboxEngine {
    constructor(config) {
        this.config = config;
    }
    copyRecursiveSync(src, dest) {
        const exists = node_fs_1.default.existsSync(src);
        const stats = exists && node_fs_1.default.statSync(src);
        const isDirectory = exists && stats && stats.isDirectory();
        if (isDirectory) {
            node_fs_1.default.mkdirSync(dest, { recursive: true });
            node_fs_1.default.readdirSync(src).forEach((childItemName) => {
                if (childItemName === "node_modules" ||
                    childItemName === ".git" ||
                    childItemName === ".tmp" ||
                    childItemName === "dist" ||
                    childItemName === ".apr" ||
                    childItemName === ".cro" ||
                    childItemName === "site") {
                    return;
                }
                this.copyRecursiveSync(node_path_1.default.join(src, childItemName), node_path_1.default.join(dest, childItemName));
            });
        }
        else {
            node_fs_1.default.copyFileSync(src, dest);
        }
    }
    async validate(patches) {
        if (this.config?.mockExec) {
            return {
                passed: this.config.mockResult !== false,
                compilePassed: this.config.mockResult !== false,
                testsPassed: this.config.mockResult !== false,
                output: "Mock sandbox validation output."
            };
        }
        const workspaceRoot = process.cwd();
        const sandboxId = `sandbox-${node_crypto_1.default.randomUUID()}`;
        const sandboxDir = node_path_1.default.join(workspaceRoot, ".tmp", sandboxId);
        try {
            // 1. Create sandbox directory and copy workspace (skipping node_modules/git/.tmp/dist)
            node_fs_1.default.mkdirSync(sandboxDir, { recursive: true });
            this.copyRecursiveSync(workspaceRoot, sandboxDir);
            // 2. Symlink/Junction node_modules
            const hostNodeModules = node_path_1.default.join(workspaceRoot, "node_modules");
            const sandboxNodeModules = node_path_1.default.join(sandboxDir, "node_modules");
            if (node_fs_1.default.existsSync(hostNodeModules)) {
                node_fs_1.default.symlinkSync(hostNodeModules, sandboxNodeModules, "junction");
            }
            const hostCicNodeModules = node_path_1.default.join(workspaceRoot, "projects/cic/node_modules");
            const sandboxCicNodeModules = node_path_1.default.join(sandboxDir, "projects/cic/node_modules");
            if (node_fs_1.default.existsSync(hostCicNodeModules)) {
                node_fs_1.default.symlinkSync(hostCicNodeModules, sandboxCicNodeModules, "junction");
            }
            // 3. Apply patches to sandbox files
            patches.forEach((patch) => {
                const targetPath = node_path_1.default.join(sandboxDir, patch.path);
                node_fs_1.default.mkdirSync(node_path_1.default.dirname(targetPath), { recursive: true });
                node_fs_1.default.writeFileSync(targetPath, patch.content, "utf8");
            });
            let compilePassed = false;
            let testsPassed = false;
            let output = "";
            // 4. Run build compilation inside sandbox
            try {
                const buildOut = (0, node_child_process_1.execSync)("npm --prefix projects/cic run build", {
                    cwd: sandboxDir,
                    stdio: "pipe",
                    env: { ...process.env, CI: "true" }
                }).toString();
                compilePassed = true;
                output += `--- COMPILE SUCCESS ---\n${buildOut}\n`;
            }
            catch (err) {
                output += `--- COMPILE FAILED ---\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}\n`;
            }
            // 5. Run tests inside sandbox (only if compilation passed)
            if (compilePassed) {
                try {
                    // We run a lightweight subset of tests or target the mee tests to keep it fast
                    const testOut = (0, node_child_process_1.execSync)("npm --prefix projects/cic test -- tests/mee/mee-planning.test.ts", {
                        cwd: sandboxDir,
                        stdio: "pipe",
                        env: { ...process.env, CI: "true" }
                    }).toString();
                    testsPassed = true;
                    output += `--- TESTS SUCCESS ---\n${testOut}\n`;
                }
                catch (err) {
                    output += `--- TESTS FAILED ---\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}\n`;
                }
            }
            const passed = compilePassed && testsPassed;
            return {
                passed,
                compilePassed,
                testsPassed,
                output
            };
        }
        catch (err) {
            return {
                passed: false,
                compilePassed: false,
                testsPassed: false,
                output: `Sandbox setup exception: ${err.message}`
            };
        }
        finally {
            // 6. Cleanup sandbox directory
            try {
                if (node_fs_1.default.existsSync(sandboxDir)) {
                    node_fs_1.default.rmSync(sandboxDir, { recursive: true, force: true });
                }
            }
            catch (cleanErr) {
                console.warn(`Failed to cleanup sandbox: ${sandboxDir}`, cleanErr);
            }
        }
    }
}
exports.MeeSandboxEngine = MeeSandboxEngine;
//# sourceMappingURL=sandbox-engine.js.map