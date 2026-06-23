import { ForemanLoader } from './loader.js';
export class Foreman {
    constructor(options = {}) {
        this.isInitialized = false;
        this.loader = new ForemanLoader({
            basePath: options.basePath,
            strict: options.strict,
        });
        this.agents = new Map();
        this.skills = new Map();
        this.adapters = new Map();
    }
    async startup(manifestPath = 'cic_foreman.agent.yaml') {
        if (this.isInitialized) {
            throw new Error('Foreman already initialized');
        }
        this.manifest = await this.loader.load(manifestPath);
        this.initializeAgents();
        this.initializeAdapters();
        this.initializeSkills();
        this.isInitialized = true;
        console.log(`[Foreman] Initialized with ${this.agents.size} agents, ${this.adapters.size} adapters, ${this.skills.size} skills`);
    }
    initializeAgents() {
        if (!this.manifest?.agents)
            return;
        for (const agent of this.manifest.agents) {
            if (agent.enabled !== false) {
                this.agents.set(agent.id, agent);
            }
        }
    }
    initializeAdapters() {
        if (!this.manifest?.adapters)
            return;
        for (const adapter of this.manifest.adapters) {
            if (adapter.enabled !== false) {
                this.adapters.set(adapter.id, adapter);
            }
        }
    }
    initializeSkills() {
        if (!this.manifest?.skills)
            return;
        for (const skill of this.manifest.skills) {
            if (skill.enabled !== false) {
                const agentExists = this.agents.has(skill.agent);
                if (!agentExists && this.manifest?.agents?.some(a => a.id === skill.agent)) {
                    continue;
                }
                this.skills.set(skill.id, skill);
            }
        }
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    getSkill(id) {
        return this.skills.get(id);
    }
    getAdapter(id) {
        return this.adapters.get(id);
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    getSkills() {
        return Array.from(this.skills.values());
    }
    getAdapters() {
        return Array.from(this.adapters.values());
    }
    getManifest() {
        return this.manifest;
    }
    isReady() {
        return this.isInitialized && this.agents.size > 0 && this.adapters.size > 0;
    }
    getSecurityPolicy(policyId) {
        return this.manifest?.securityPolicies?.find(p => p.id === policyId);
    }
    getTaskTemplate(templateId) {
        return this.manifest?.taskTemplates?.find(t => t.id === templateId);
    }
}
let foremanInstance = null;
export function initializeForeman(options) {
    if (foremanInstance) {
        throw new Error('Foreman already initialized');
    }
    foremanInstance = new Foreman(options);
    return foremanInstance;
}
export function getForeman() {
    if (!foremanInstance) {
        foremanInstance = new Foreman();
    }
    return foremanInstance;
}
//# sourceMappingURL=foreman.js.map