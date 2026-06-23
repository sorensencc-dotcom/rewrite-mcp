"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExtractor = void 0;
const pms_executor_1 = require("../../pms/pms.executor");
class BaseExtractor {
    constructor() {
        this.pms = new pms_executor_1.PMSExecutor();
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
exports.BaseExtractor = BaseExtractor;
//# sourceMappingURL=base-extractor.js.map