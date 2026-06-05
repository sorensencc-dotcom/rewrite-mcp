// File: projects/cic/evolution/src/amb/ambRlTestGate.ts | Date: 2026-06-05 | v1.0.0

import { spawnSync } from "node:child_process";

export class AmbRlTestGate {
  private cachedHealthy: boolean | null = null;

  constructor(private readonly baseDir: string = process.cwd()) {}

  isRlHealthy(): boolean {
    if (this.cachedHealthy !== null) return this.cachedHealthy;

    if (process.env.BYPASS_RL_TESTS === "true") {
      this.cachedHealthy = true;
      return true;
    }

    console.log("[AmbRlTestGate] Executing npm run test:rewrite-labs...");
    const result = spawnSync("npm", ["run", "test:rewrite-labs"], {
      stdio: "inherit",
      shell: true,
      cwd: this.baseDir
    });

    this.cachedHealthy = result.status === 0;
    return this.cachedHealthy;
  }
}
