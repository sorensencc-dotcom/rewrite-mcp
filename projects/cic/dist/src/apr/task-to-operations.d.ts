import { PlanningTask } from './types.js';
import { AdapterOperation } from '../cro/types.js';
export interface TaskOperationMapping {
    taskId: string;
    taskType: string;
    operations: AdapterOperation[];
    estimatedDuration: number;
}
export declare class TaskToOperationsConverter {
    convert(task: PlanningTask): TaskOperationMapping;
    private generateAutoExecutableOps;
    private generateOperatorRequiredOps;
    private estimateDuration;
}
