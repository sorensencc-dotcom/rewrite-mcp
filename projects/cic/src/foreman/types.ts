export interface ForemanAgent {
  id: string;
  name: string;
  description?: string;
  type: 'executor' | 'planner' | 'coordinator' | 'validator';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ForemanSkill {
  id: string;
  name: string;
  description?: string;
  agent: string;
  operationType: 'shell' | 'file' | 'http' | 'model';
  enabled: boolean;
  permissions?: string[];
}

export interface ForemanAdapter {
  id: string;
  name: string;
  type: 'shell' | 'file' | 'http' | 'model' | 'browser';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ForemanTaskTemplate {
  id: string;
  name: string;
  description?: string;
  operations: Array<{
    type: 'shell' | 'file' | 'http' | 'model';
    operation: string;
    args?: Record<string, any>;
  }>;
  expectedDuration?: number;
}

export interface ForemanSecurityPolicy {
  id: string;
  name: string;
  rules: Array<{
    adapter: string;
    action: 'allow' | 'deny' | 'require-approval';
    constraint?: string;
    reason?: string;
  }>;
}

export interface ForemanManifest {
  version: string;
  name: string;
  description?: string;
  createdAt: string;
  agents: ForemanAgent[];
  skills: ForemanSkill[];
  adapters: ForemanAdapter[];
  taskTemplates?: ForemanTaskTemplate[];
  securityPolicies?: ForemanSecurityPolicy[];
  metadata?: {
    environment?: string;
    owner?: string;
    tags?: string[];
  };
}
