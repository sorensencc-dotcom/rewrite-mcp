"use strict";
// File: projects/cic/src/mee/mee-agent-orchestrator.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeAgentOrchestrator = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const mee_consensus_engine_js_1 = require("./mee-consensus-engine.js");
class MeeAgentOrchestrator {
    getAgents() {
        return Array.from(this.agents.values());
    }
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.agents = new Map();
    }
    tasksFile() {
        return node_path_1.default.join(this.baseDir, "mee-agent-tasks.json");
    }
    exchangesFile() {
        return node_path_1.default.join(this.baseDir, "mee-agent-exchanges.json");
    }
    loadTasks() {
        if (!node_fs_1.default.existsSync(this.tasksFile()))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(this.tasksFile(), "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveTasks(tasks) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.tasksFile()), { recursive: true });
        node_fs_1.default.writeFileSync(this.tasksFile(), JSON.stringify(tasks, null, 2), "utf8");
    }
    loadExchanges() {
        if (!node_fs_1.default.existsSync(this.exchangesFile()))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(this.exchangesFile(), "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveExchanges(exchanges) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.exchangesFile()), { recursive: true });
        node_fs_1.default.writeFileSync(this.exchangesFile(), JSON.stringify(exchanges, null, 2), "utf8");
    }
    registerAgent(agent) {
        this.agents.set(agent.id, agent);
    }
    scheduleTasksForPlan(job, plan) {
        const planner = Array.from(this.agents.values()).find((a) => a.role === "planner");
        if (!planner)
            return [];
        const task = {
            id: node_crypto_1.default.randomUUID(),
            agentId: planner.id,
            jobId: job.id,
            createdAt: new Date().toISOString(),
            type: "plan_refinement",
            payload: { plan, request: job.request, planningMode: job.planningMode },
            status: "pending",
        };
        const tasks = this.loadTasks();
        tasks.push(task);
        this.saveTasks(tasks);
        return [task];
    }
    async dispatchTask(taskId) {
        const tasks = this.loadTasks();
        const task = tasks.find((t) => t.id === taskId);
        if (!task)
            return;
        const agent = this.agents.get(task.agentId);
        if (!agent)
            return;
        task.status = "running";
        this.saveTasks(tasks);
        const req = {
            id: node_crypto_1.default.randomUUID(),
            taskId: task.id,
            agentId: agent.id,
            createdAt: new Date().toISOString(),
            direction: "request",
            content: JSON.stringify(task.payload),
        };
        const exchanges = this.loadExchanges();
        exchanges.push(req);
        this.saveExchanges(exchanges);
        try {
            const res = await agent.handleTask(task);
            const updatedExchanges = this.loadExchanges();
            updatedExchanges.push(res);
            this.saveExchanges(updatedExchanges);
            const updatedTasks = this.loadTasks();
            const tIdx = updatedTasks.findIndex((t) => t.id === taskId);
            if (tIdx >= 0) {
                updatedTasks[tIdx].status = "completed";
                this.saveTasks(updatedTasks);
            }
        }
        catch (err) {
            const updatedTasks = this.loadTasks();
            const tIdx = updatedTasks.findIndex((t) => t.id === taskId);
            if (tIdx >= 0) {
                updatedTasks[tIdx].status = "failed";
                updatedTasks[tIdx].errorMessage = err?.message ?? String(err);
                this.saveTasks(updatedTasks);
            }
        }
    }
    getTaskHistory(taskId) {
        return this.loadExchanges().filter((e) => e.taskId === taskId);
    }
    getTasksForJob(jobId) {
        return this.loadTasks().filter((t) => t.jobId === jobId);
    }
    getExchangesForJob(jobId) {
        const jobTasks = this.getTasksForJob(jobId);
        const taskIds = new Set(jobTasks.map((t) => t.id));
        return this.loadExchanges().filter((e) => taskIds.has(e.taskId));
    }
    consensusFile() {
        return node_path_1.default.join(this.baseDir, "mee-consensus.json");
    }
    loadConsensus() {
        if (!node_fs_1.default.existsSync(this.consensusFile()))
            return [];
        try {
            const raw = node_fs_1.default.readFileSync(this.consensusFile(), "utf8");
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveConsensus(results) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.consensusFile()), { recursive: true });
        node_fs_1.default.writeFileSync(this.consensusFile(), JSON.stringify(results, null, 2), "utf8");
    }
    getConsensusForJob(jobId, jobProposalIds) {
        const pIds = new Set(jobProposalIds);
        return this.loadConsensus().filter(r => pIds.has(r.proposalId));
    }
    async runCritiqueRound(tasks) {
        const exchanges = [];
        for (const task of tasks) {
            await this.dispatchTask(task.id);
            const history = this.getTaskHistory(task.id);
            const res = history.find((e) => e.direction === "response");
            if (res) {
                exchanges.push(res);
            }
        }
        return exchanges;
    }
    runConsensusRound(critiques, proposalId = "proposal-1", cycle = 1) {
        const engine = new mee_consensus_engine_js_1.MeeConsensusEngine();
        const score = engine.scoreProposal(proposalId, critiques, cycle);
        const result = engine.determineResult(proposalId, score.score, critiques, cycle);
        const results = this.loadConsensus();
        results.push(result);
        this.saveConsensus(results);
        return result;
    }
    async runRefinementRound(plan, proposals, critiques = [], jobId = "job-1") {
        const now = new Date().toISOString();
        const tasks = [];
        // Schedule refinement tasks for each relevant agent
        for (const agent of this.agents.values()) {
            if (agent.role === "planner" || agent.role === "refactor" || agent.role === "docs" || agent.role === "safety") {
                const task = {
                    id: node_crypto_1.default.randomUUID(),
                    agentId: agent.id,
                    jobId,
                    createdAt: now,
                    type: "refine",
                    payload: {
                        proposal: proposals[0], // primary proposal being refined
                        patches: proposals[0]?.filesCreated.map(p => ({ path: p, content: "", type: "modify" })) || [], // placeholder
                        plan,
                        critiques
                    },
                    status: "pending"
                };
                tasks.push(task);
            }
        }
        const allTasks = this.loadTasks();
        allTasks.push(...tasks);
        this.saveTasks(allTasks);
        let refinedPlan = { ...plan };
        let refinedProposals = proposals.map(p => ({ ...p }));
        for (const task of tasks) {
            await this.dispatchTask(task.id);
            const history = this.getTaskHistory(task.id);
            const res = history.find((e) => e.direction === "response");
            if (res) {
                try {
                    const data = JSON.parse(res.content);
                    if (data.refinedPlan) {
                        refinedPlan = data.refinedPlan;
                    }
                    if (data.refinedProposal && refinedProposals[0]) {
                        refinedProposals[0] = { ...refinedProposals[0], ...data.refinedProposal };
                    }
                    // If RefactorAgent refined patches, we can simulate updating the files/patches
                    if (data.refinedPatches && refinedProposals[0]) {
                        refinedProposals[0].planSummary += " (Refined patches)";
                    }
                }
                catch (e) {
                    console.error(`Refinement response parse failed for agent ${task.agentId}:`, e);
                }
            }
        }
        return { refinedPlan, refinedProposals };
    }
}
exports.MeeAgentOrchestrator = MeeAgentOrchestrator;
//# sourceMappingURL=mee-agent-orchestrator.js.map