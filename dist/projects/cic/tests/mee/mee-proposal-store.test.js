"use strict";
// File: projects/cic/tests/mee/mee-proposal-store.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mee_proposal_store_js_1 = require("../../src/mee/mee-proposal-store.js");
const TEST_BASE = node_path_1.default.join(process.cwd(), ".tmp", "mee-store-test");
function cleanup() {
    if (node_fs_1.default.existsSync(TEST_BASE)) {
        node_fs_1.default.rmSync(TEST_BASE, { recursive: true, force: true });
    }
}
(0, vitest_1.describe)("MeeProposalStore", () => {
    (0, vitest_1.beforeEach)(() => {
        cleanup();
    });
    (0, vitest_1.afterEach)(() => {
        cleanup();
    });
    (0, vitest_1.it)("returns empty list when no file exists", () => {
        const store = new mee_proposal_store_js_1.MeeProposalStore(TEST_BASE);
        const all = store.loadAll();
        (0, vitest_1.expect)(all).toEqual([]);
    });
    (0, vitest_1.it)("adds and retrieves a proposal", () => {
        const store = new mee_proposal_store_js_1.MeeProposalStore(TEST_BASE);
        const proposal = {
            id: "p1",
            title: "Test Proposal",
            triggerId: "t1",
            status: "pending",
            filesCreated: [],
            planSummary: "summary",
            timestamp: Date.now(),
        };
        store.add(proposal);
        const loaded = store.get("p1");
        (0, vitest_1.expect)(loaded).not.toBeNull();
        (0, vitest_1.expect)(loaded?.title).toBe("Test Proposal");
    });
    (0, vitest_1.it)("updates an existing proposal", () => {
        const store = new mee_proposal_store_js_1.MeeProposalStore(TEST_BASE);
        const proposal = {
            id: "p2",
            title: "Initial",
            triggerId: "t2",
            status: "pending",
            filesCreated: [],
            planSummary: "summary",
            timestamp: Date.now(),
        };
        store.add(proposal);
        store.update("p2", { status: "validated" });
        const loaded = store.get("p2");
        (0, vitest_1.expect)(loaded?.status).toBe("validated");
    });
    (0, vitest_1.it)("persists across instances", () => {
        const store1 = new mee_proposal_store_js_1.MeeProposalStore(TEST_BASE);
        const proposal = {
            id: "p3",
            title: "Persisted",
            triggerId: "t3",
            status: "pending",
            filesCreated: [],
            planSummary: "summary",
            timestamp: Date.now(),
        };
        store1.add(proposal);
        const store2 = new mee_proposal_store_js_1.MeeProposalStore(TEST_BASE);
        const all = store2.loadAll();
        (0, vitest_1.expect)(all.find((p) => p.id === "p3")).toBeTruthy();
    });
});
//# sourceMappingURL=mee-proposal-store.test.js.map