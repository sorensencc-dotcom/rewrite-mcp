export interface PlanningGoal {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    source: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
}
export interface PlanningTask {
    id: string;
    goalId: string;
    title: string;
    description: string;
    owner: string;
    status: "pending" | "assigned" | "completed";
    type: "AUTO_EXECUTABLE" | "OPERATOR_REQUIRED";
}
export interface PlanningPlan {
    goals: PlanningGoal[];
    tasks: PlanningTask[];
}
export interface PlannerDecision {
    plan: PlanningPlan;
    reasoning: string;
}
export interface PlannerCritique {
    reviewerRole: "critic" | "operator" | "planner";
    approved: boolean;
    feedback: string;
    riskLevel: "low" | "medium" | "high";
}
export interface PlanningEpisode {
    id: string;
    timestamp: string;
    decision: PlannerDecision;
    critiques: PlannerCritique[];
    status: "committed" | "aborted" | "dry_run";
}
export interface TaskAssignment {
    taskId: string;
    owner: string;
    status: "assigned" | "rejected" | "completed";
}
