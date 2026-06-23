"use strict";
// File: projects/cic/src/mee/planning/task-extractor.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExtractor = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class TaskExtractor {
    extractTasks(request) {
        const tasks = [];
        const lower = request.toLowerCase();
        if (lower.includes("extractor")) {
            tasks.push(this.make("feature", "Add new extractor", "Implement extractor module"));
            tasks.push(this.make("test", "Add extractor tests", "Write extractor unit tests"));
        }
        if (lower.includes("validator")) {
            tasks.push(this.make("refactor", "Refactor validator", "Improve validator structure"));
            tasks.push(this.make("test", "Add validator tests", "Increase validator coverage"));
        }
        if (lower.includes("ui")) {
            tasks.push(this.make("feature", "Update UI", "Modify MetaEvolutionConsole UI"));
        }
        return tasks;
    }
    make(type, title, description) {
        return {
            id: node_crypto_1.default.randomUUID(),
            title,
            description,
            type,
            dependsOn: [],
        };
    }
}
exports.TaskExtractor = TaskExtractor;
//# sourceMappingURL=task-extractor.js.map