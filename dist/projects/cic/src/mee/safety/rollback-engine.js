"use strict";
// File: projects/cic/src/mee/safety/rollback-engine.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeRollbackEngine = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class MeeRollbackEngine {
    snapshot(patches) {
        const workspaceRoot = process.cwd();
        const backupMap = {};
        patches.forEach((patch) => {
            const fullPath = node_path_1.default.resolve(workspaceRoot, patch.path);
            if (node_fs_1.default.existsSync(fullPath)) {
                backupMap[patch.path] = node_fs_1.default.readFileSync(fullPath, "utf8");
            }
            else {
                backupMap[patch.path] = null;
            }
        });
        return backupMap;
    }
    restore(backupMap) {
        const workspaceRoot = process.cwd();
        Object.entries(backupMap).forEach(([filePath, content]) => {
            const fullPath = node_path_1.default.resolve(workspaceRoot, filePath);
            if (content === null) {
                if (node_fs_1.default.existsSync(fullPath)) {
                    node_fs_1.default.unlinkSync(fullPath);
                }
            }
            else {
                node_fs_1.default.mkdirSync(node_path_1.default.dirname(fullPath), { recursive: true });
                node_fs_1.default.writeFileSync(fullPath, content, "utf8");
            }
        });
    }
}
exports.MeeRollbackEngine = MeeRollbackEngine;
//# sourceMappingURL=rollback-engine.js.map