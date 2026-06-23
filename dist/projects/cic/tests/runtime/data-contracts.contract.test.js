"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const data_contracts_js_1 = require("../../src/runtime/data-contracts.js");
(0, vitest_1.describe)("Data Contract Validation", () => {
    (0, vitest_1.it)("validates ingestion job schema", () => {
        const job = {
            job_id: "123",
            type: "image",
            source: "file://A.jpg"
        };
        (0, vitest_1.expect)((0, data_contracts_js_1.validateIngestionJob)(job).ok).toBe(true);
    });
    (0, vitest_1.it)("rejects invalid ingestion job schema", () => {
        const job = { type: "image" };
        (0, vitest_1.expect)((0, data_contracts_js_1.validateIngestionJob)(job).ok).toBe(false);
    });
    (0, vitest_1.it)("validates vector payload schema", () => {
        const payload = {
            id: "file1",
            vector: [0.1, 0.2, 0.3],
            payload: { extractor: "ImageAnalyzerV2" }
        };
        (0, vitest_1.expect)((0, data_contracts_js_1.validateVectorPayload)(payload).ok).toBe(true);
    });
    (0, vitest_1.it)("rejects invalid vector payload schema", () => {
        const payload = { id: "file1", vector: [] };
        (0, vitest_1.expect)((0, data_contracts_js_1.validateVectorPayload)(payload).ok).toBe(false);
    });
});
//# sourceMappingURL=data-contracts.contract.test.js.map