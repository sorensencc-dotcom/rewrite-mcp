import { SkillGraphStore } from "../skills/skill-graph-store.js";
import { PlanningTask, TaskAssignment } from "./types.js";
export declare class TaskAllocator {
    private skillStore?;
    constructor(skillStore?: SkillGraphStore | undefined);
    allocate(task: PlanningTask): TaskAssignment;
    allocateBulk(tasks: PlanningTask[]): TaskAssignment[];
}
//# sourceMappingURL=task-allocator.d.ts.map