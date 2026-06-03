// File: projects/cic/src/mee/planning/task-extractor.ts | Date: 2026-06-03 | v1.0.0

import crypto from "node:crypto";
import { PlanTask } from "../mee-schema.js";

export class TaskExtractor {
  extractTasks(request: string): PlanTask[] {
    const tasks: PlanTask[] = [];
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

  private make(type: PlanTask["type"], title: string, description: string): PlanTask {
    return {
      id: crypto.randomUUID(),
      title,
      description,
      type,
      dependsOn: [],
    };
  }
}
