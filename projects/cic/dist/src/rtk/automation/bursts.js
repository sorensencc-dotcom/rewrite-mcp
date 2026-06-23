import { submitIngestionJob } from "../../runtime/rtk-cic.js";
import { validateRRKGoal } from "../../runtime/rrk-rtk.js";
export class BurstPlanner {
    constructor() {
        this.activeBursts = new Map();
    }
    planBurst(goals, sectionId, priority = "normal") {
        const validGoals = goals.filter((g) => validateRRKGoal(g).ok);
        const burstId = "burst-" + Math.random().toString(36).substr(2, 9);
        const jobs = validGoals.map((g) => {
            const jobId = "job-" + Math.random().toString(36).substr(2, 9);
            let extractorType = "document";
            if (g.type === "ingest_target") {
                extractorType = "image";
            }
            return {
                job_id: jobId,
                type: extractorType,
                source: g.target,
                extractor_type: extractorType,
                pms_template_id: extractorType === "image" ? "image_analysis_v1" : "text_analysis_v1",
                section_id: sectionId,
            };
        });
        const burst = {
            burst_id: burstId,
            section_id: sectionId,
            created_at: new Date().toISOString(),
            goals: validGoals.map((g) => g.goal_id || "goal-1"),
            jobs: jobs.map((j) => j.job_id),
            priority,
            status: "queued",
        };
        this.activeBursts.set(burstId, burst);
        return burst;
    }
    async dispatchBurst(burst, jobs) {
        burst.status = "running";
        let successCount = 0;
        let failureCount = 0;
        for (const job of jobs) {
            if (burst.jobs.includes(job.job_id)) {
                const res = await submitIngestionJob(job);
                if (res.ok) {
                    successCount++;
                }
                else {
                    failureCount++;
                }
            }
        }
        const total = successCount + failureCount;
        const failureRate = total > 0 ? failureCount / total : 0;
        if (failureRate > 0.5) {
            burst.status = "failed";
        }
        else {
            burst.status = "completed";
        }
        return { successCount, failureCount };
    }
}
//# sourceMappingURL=bursts.js.map