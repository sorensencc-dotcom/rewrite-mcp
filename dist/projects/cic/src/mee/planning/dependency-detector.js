"use strict";
// File: projects/cic/src/mee/planning/dependency-detector.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyDetector = void 0;
class DependencyDetector {
    orderTasks(tasks) {
        const feature = tasks.filter((t) => t.type === "feature" || t.type === "refactor");
        const tests = tasks.filter((t) => t.type === "test");
        const docs = tasks.filter((t) => t.type === "doc");
        for (const test of tests) {
            test.dependsOn = feature.map((f) => f.id);
        }
        return [...feature, ...tests, ...docs];
    }
}
exports.DependencyDetector = DependencyDetector;
//# sourceMappingURL=dependency-detector.js.map