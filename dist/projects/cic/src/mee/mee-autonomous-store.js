"use strict";
// File: projects/cic/src/mee/mee-autonomous-store.ts | Date: 2026-06-04 | v1.1.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMeeHealingPlanStore = exports.FileMeeRunFailureContextStore = exports.FileMeeAutonomousJobStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class FileMeeAutonomousJobStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    jobsFile() {
        return node_path_1.default.join(this.baseDir, "mee-autonomous-jobs.json");
    }
    load(file) {
        if (!node_fs_1.default.existsSync(file))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(file, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveAll(file, items) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        node_fs_1.default.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
    }
    save(job) {
        const file = this.jobsFile();
        const jobs = this.load(file);
        const idx = jobs.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
            jobs[idx] = job;
        }
        else {
            jobs.push(job);
        }
        this.saveAll(file, jobs);
    }
    get(id) {
        const jobs = this.load(this.jobsFile());
        return jobs.find((j) => j.id === id);
    }
    list() {
        return this.load(this.jobsFile());
    }
}
exports.FileMeeAutonomousJobStore = FileMeeAutonomousJobStore;
class FileMeeRunFailureContextStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    failuresFile() {
        return node_path_1.default.join(this.baseDir, "mee-run-failures.json");
    }
    load(file) {
        if (!node_fs_1.default.existsSync(file))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(file, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveAll(file, items) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        node_fs_1.default.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
    }
    save(context) {
        const file = this.failuresFile();
        const failures = this.load(file);
        const idx = failures.findIndex((f) => f.runId === context.runId);
        if (idx >= 0) {
            failures[idx] = context;
        }
        else {
            failures.push(context);
        }
        this.saveAll(file, failures);
    }
    get(runId) {
        const failures = this.load(this.failuresFile());
        return failures.find((f) => f.runId === runId);
    }
    getByJob(jobId) {
        const failures = this.load(this.failuresFile());
        return failures.find((f) => f.jobId === jobId);
    }
    list() {
        return this.load(this.failuresFile());
    }
}
exports.FileMeeRunFailureContextStore = FileMeeRunFailureContextStore;
class FileMeeHealingPlanStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    plansFile() {
        return node_path_1.default.join(this.baseDir, "mee-healing-plans.json");
    }
    load(file) {
        if (!node_fs_1.default.existsSync(file))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(file, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveAll(file, items) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        node_fs_1.default.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
    }
    save(plan) {
        const file = this.plansFile();
        const plans = this.load(file);
        const idx = plans.findIndex((p) => p.id === plan.id);
        if (idx >= 0) {
            plans[idx] = plan;
        }
        else {
            plans.push(plan);
        }
        this.saveAll(file, plans);
    }
    get(id) {
        const plans = this.load(this.plansFile());
        return plans.find((p) => p.id === id);
    }
    getByParentJob(jobId) {
        const plans = this.load(this.plansFile());
        return plans.find((p) => p.parentJobId === jobId);
    }
    list() {
        return this.load(this.plansFile());
    }
}
exports.FileMeeHealingPlanStore = FileMeeHealingPlanStore;
//# sourceMappingURL=mee-autonomous-store.js.map