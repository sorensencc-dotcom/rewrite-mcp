"use strict";
// File: projects/cic/evolution/src/amb/ambRlTestGate.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbRlTestGate = void 0;
const node_child_process_1 = require("node:child_process");
class AmbRlTestGate {
    constructor(baseDir = process.cwd()) {
        this.baseDir = baseDir;
        this.cachedHealthy = null;
    }
    isRlHealthy() {
        if (this.cachedHealthy !== null)
            return this.cachedHealthy;
        if (process.env.BYPASS_RL_TESTS === "true") {
            this.cachedHealthy = true;
            return true;
        }
        const result = (0, node_child_process_1.spawnSync)("npm", ["run", "test:rewrite-labs"], {
            stdio: "ignore",
            shell: true,
            cwd: this.baseDir
        });
        this.cachedHealthy = result.status === 0;
        return this.cachedHealthy;
    }
}
exports.AmbRlTestGate = AmbRlTestGate;
//# sourceMappingURL=ambRlTestGate.js.map