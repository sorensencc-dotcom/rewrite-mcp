// File: projects/cic/src/mee/planning/dependency-detector.ts | Date: 2026-06-03 | v1.0.0

import { PlanTask } from "../mee-schema.js";

export class DependencyDetector {
  orderTasks(tasks: PlanTask[]): PlanTask[] {
    const feature = tasks.filter((t) => t.type === "feature" || t.type === "refactor");
    const tests = tasks.filter((t) => t.type === "test");
    const docs = tasks.filter((t) => t.type === "doc");

    for (const test of tests) {
      test.dependsOn = feature.map((f) => f.id);
    }

    return [...feature, ...tests, ...docs];
  }
}
