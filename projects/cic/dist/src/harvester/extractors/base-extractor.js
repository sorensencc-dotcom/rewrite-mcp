import { PMSExecutor } from "../../pms/pms.executor";
export class BaseExtractor {
    constructor() {
        this.pms = new PMSExecutor();
        this.pms.initialize();
    }
    async buildPrompt(templateId, vars) {
        try {
            const result = this.pms.execute(templateId, vars);
            return result.prompt.resolved;
        }
        catch (err) {
            throw new Error(`[PMS] Failed to build prompt for template '${templateId}': ${err.message}`);
        }
    }
}
//# sourceMappingURL=base-extractor.js.map