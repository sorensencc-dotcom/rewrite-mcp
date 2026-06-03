// File: projects/cic/src/mee/safety/sandbox-engine.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { PhasePatch, MeeSandboxResult } from "../mee-schema.js";

export class MeeSandboxEngine {
  constructor(private readonly config?: { mockExec?: boolean; mockResult?: boolean }) {}

  private copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory();
    if (isDirectory) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItemName) => {
        if (
          childItemName === "node_modules" ||
          childItemName === ".git" ||
          childItemName === ".tmp" ||
          childItemName === "dist" ||
          childItemName === ".apr" ||
          childItemName === ".cro" ||
          childItemName === "site"
        ) {
          return;
        }
        this.copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  async validate(patches: PhasePatch[]): Promise<MeeSandboxResult> {
    if (this.config?.mockExec) {
      return {
        passed: this.config.mockResult !== false,
        compilePassed: this.config.mockResult !== false,
        testsPassed: this.config.mockResult !== false,
        output: "Mock sandbox validation output."
      };
    }

    const workspaceRoot = process.cwd();
    const sandboxId = `sandbox-${crypto.randomUUID()}`;
    const sandboxDir = path.join(workspaceRoot, ".tmp", sandboxId);

    try {
      // 1. Create sandbox directory and copy workspace (skipping node_modules/git/.tmp/dist)
      fs.mkdirSync(sandboxDir, { recursive: true });
      this.copyRecursiveSync(workspaceRoot, sandboxDir);

      // 2. Symlink/Junction node_modules
      const hostNodeModules = path.join(workspaceRoot, "node_modules");
      const sandboxNodeModules = path.join(sandboxDir, "node_modules");
      if (fs.existsSync(hostNodeModules)) {
        fs.symlinkSync(hostNodeModules, sandboxNodeModules, "junction");
      }

      const hostCicNodeModules = path.join(workspaceRoot, "projects/cic/node_modules");
      const sandboxCicNodeModules = path.join(sandboxDir, "projects/cic/node_modules");
      if (fs.existsSync(hostCicNodeModules)) {
        fs.symlinkSync(hostCicNodeModules, sandboxCicNodeModules, "junction");
      }

      // 3. Apply patches to sandbox files
      patches.forEach((patch) => {
        const targetPath = path.join(sandboxDir, patch.path);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, patch.content, "utf8");
      });

      let compilePassed = false;
      let testsPassed = false;
      let output = "";

      // 4. Run build compilation inside sandbox
      try {
        const buildOut = execSync("npm --prefix projects/cic run build", {
          cwd: sandboxDir,
          stdio: "pipe",
          env: { ...process.env, CI: "true" }
        }).toString();
        compilePassed = true;
        output += `--- COMPILE SUCCESS ---\n${buildOut}\n`;
      } catch (err: any) {
        output += `--- COMPILE FAILED ---\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}\n`;
      }

      // 5. Run tests inside sandbox (only if compilation passed)
      if (compilePassed) {
        try {
          // We run a lightweight subset of tests or target the mee tests to keep it fast
          const testOut = execSync("npm --prefix projects/cic test -- tests/mee/mee-planning.test.ts", {
            cwd: sandboxDir,
            stdio: "pipe",
            env: { ...process.env, CI: "true" }
          }).toString();
          testsPassed = true;
          output += `--- TESTS SUCCESS ---\n${testOut}\n`;
        } catch (err: any) {
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
    } catch (err: any) {
      return {
        passed: false,
        compilePassed: false,
        testsPassed: false,
        output: `Sandbox setup exception: ${err.message}`
      };
    } finally {
      // 6. Cleanup sandbox directory
      try {
        if (fs.existsSync(sandboxDir)) {
          fs.rmSync(sandboxDir, { recursive: true, force: true });
        }
      } catch (cleanErr) {
        console.warn(`Failed to cleanup sandbox: ${sandboxDir}`, cleanErr);
      }
    }
  }
}
