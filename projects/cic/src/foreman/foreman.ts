import { ForemanLoader, LoaderOptions } from './loader.js';
import { ForemanManifest, ForemanAgent, ForemanSkill, ForemanAdapter } from './types.js';

export interface ForemanOptions extends LoaderOptions {
  manifestPath?: string;
}

export class Foreman {
  private manifest?: ForemanManifest;
  private loader: ForemanLoader;
  private agents: Map<string, ForemanAgent>;
  private skills: Map<string, ForemanSkill>;
  private adapters: Map<string, ForemanAdapter>;
  private isInitialized: boolean = false;

  constructor(options: ForemanOptions = {}) {
    this.loader = new ForemanLoader({
      basePath: options.basePath,
      strict: options.strict,
    });
    this.agents = new Map();
    this.skills = new Map();
    this.adapters = new Map();
  }

  async startup(manifestPath: string = 'cic_foreman.agent.yaml'): Promise<void> {
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

  private initializeAgents(): void {
    if (!this.manifest?.agents) return;

    for (const agent of this.manifest.agents) {
      if (agent.enabled !== false) {
        this.agents.set(agent.id, agent);
      }
    }
  }

  private initializeAdapters(): void {
    if (!this.manifest?.adapters) return;

    for (const adapter of this.manifest.adapters) {
      if (adapter.enabled !== false) {
        this.adapters.set(adapter.id, adapter);
      }
    }
  }

  private initializeSkills(): void {
    if (!this.manifest?.skills) return;

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

  getAgent(id: string): ForemanAgent | undefined {
    return this.agents.get(id);
  }

  getSkill(id: string): ForemanSkill | undefined {
    return this.skills.get(id);
  }

  getAdapter(id: string): ForemanAdapter | undefined {
    return this.adapters.get(id);
  }

  getAgents(): ForemanAgent[] {
    return Array.from(this.agents.values());
  }

  getSkills(): ForemanSkill[] {
    return Array.from(this.skills.values());
  }

  getAdapters(): ForemanAdapter[] {
    return Array.from(this.adapters.values());
  }

  getManifest(): ForemanManifest | undefined {
    return this.manifest;
  }

  isReady(): boolean {
    return this.isInitialized && this.agents.size > 0 && this.adapters.size > 0;
  }

  getSecurityPolicy(policyId: string) {
    return this.manifest?.securityPolicies?.find(p => p.id === policyId);
  }

  getTaskTemplate(templateId: string) {
    return this.manifest?.taskTemplates?.find(t => t.id === templateId);
  }
}

let foremanInstance: Foreman | null = null;

export function initializeForeman(options?: ForemanOptions): Foreman {
  if (foremanInstance) {
    throw new Error('Foreman already initialized');
  }
  foremanInstance = new Foreman(options);
  return foremanInstance;
}

export function getForeman(): Foreman {
  if (!foremanInstance) {
    foremanInstance = new Foreman();
  }
  return foremanInstance;
}
