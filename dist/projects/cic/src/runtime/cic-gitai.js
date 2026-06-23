"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGovernanceDelta = generateGovernanceDelta;
function generateGovernanceDelta(data) {
    if (!data || typeof data !== "object")
        throw new Error("Invalid data");
    if (!data.system || !data.state || !data.roadmap || !data.changes) {
        throw new Error("Missing required fields");
    }
    return {
        system_version: data.system,
        state_version: data.state,
        roadmap_version: data.roadmap,
        changes: data.changes
    };
}
//# sourceMappingURL=cic-gitai.js.map