"use strict";
// File: projects/cic/src/apr/task-allocator.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskAllocator = void 0;
class TaskAllocator {
    constructor(skillStore) {
        this.skillStore = skillStore;
    }
    allocate(task) {
        if (!this.skillStore) {
            return {
                taskId: task.id,
                owner: task.owner || "operator",
                status: task.type === "AUTO_EXECUTABLE" ? "assigned" : "rejected"
            };
        }
        try {
            const graph = this.skillStore.load();
            // Check if the owner agent or tool exists in the graph nodes
            const nodeExists = graph.nodes.some(node => node.id === task.owner && (node.type === "agent" || node.type === "tool"));
            if (nodeExists) {
                return {
                    taskId: task.id,
                    owner: task.owner,
                    status: "assigned"
                };
            }
            else {
                // Fallback to operator if the agent/tool doesn't exist in the Skill Graph
                return {
                    taskId: task.id,
                    owner: "operator",
                    status: task.type === "AUTO_EXECUTABLE" ? "assigned" : "rejected"
                };
            }
        }
        catch {
            return {
                taskId: task.id,
                owner: task.owner || "operator",
                status: "assigned"
            };
        }
    }
    allocateBulk(tasks) {
        return tasks.map(task => this.allocate(task));
    }
}
exports.TaskAllocator = TaskAllocator;
//# sourceMappingURL=task-allocator.js.map