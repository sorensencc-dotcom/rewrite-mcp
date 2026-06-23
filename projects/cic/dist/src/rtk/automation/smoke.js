import { PMSExecutor } from "../../pms/pms.executor.js";
import { submitIngestionJob } from "../../runtime/rtk-cic.js";
export class SmokeTestRunner {
    constructor() {
        this.pms = new PMSExecutor();
        this.pms.initialize();
    }
    async runSmokeTests(sectionId) {
        try {
            // 1. Validate PMS templates resolve correctly
            const imageResult = this.pms.execute("image_analysis_v1", {
                filename: "smoke.jpg",
                mime: "image/jpeg",
            });
            if (!imageResult || imageResult.status === "error") {
                return { ok: false, error: "PMS image_analysis_v1 template resolution failed" };
            }
            const textResult = this.pms.execute("text_analysis_v1", {
                length: "10",
            });
            if (!textResult || textResult.status === "error") {
                return { ok: false, error: "PMS text_analysis_v1 template resolution failed" };
            }
            // 2. Validate a minimal ingestion job runs successfully
            const smokeJob = {
                job_id: "smoke-" + Math.random().toString(36).substr(2, 9),
                type: "image",
                source: "smoke-test",
                target: "file://smoke.jpg",
                extractor_type: "image",
                pms_template_id: "image_analysis_v1",
                section_id: sectionId,
            };
            const submitRes = await submitIngestionJob(smokeJob);
            if (!submitRes.ok) {
                return { ok: false, error: "Smoke ingestion job execution failed" };
            }
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
}
//# sourceMappingURL=smoke.js.map