export interface IngestionBurst {
  burst_id: string;
  section_id: string;
  created_at: string;
  goals: string[]; // RRK goal IDs
  jobs: string[];  // CIC job IDs
  priority: "low" | "normal" | "high";
  status: "queued" | "running" | "completed" | "failed";
}

export interface RTKAutomationState {
  version: string;
  active_section_id: string | null;
  open_bursts: IngestionBurst[];
  blocked_sections: string[];
  failure_rate: number;
}
