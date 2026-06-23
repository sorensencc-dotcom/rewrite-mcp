const API_URL = import.meta.env.VITE_CIC_API_URL || 'http://localhost:8080';

export interface HealthData {
  status: 'green' | 'yellow' | 'red';
  uptimePercent: number;
  activeServices: number;
  lastErrorAt?: string | null;
}

export interface Pipeline {
  id: string;
  name: string;
  progressPercent: number;
  etaSeconds: number;
  status: 'running' | 'paused' | 'error' | 'complete';
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latency: number;
  cost: number;
}

export interface WorkspaceData {
  user: {
    name: string;
    email: string;
    role: string;
  };
  permissions: string[];
  activity: Array<{
    action: string;
    timestamp: string;
  }>;
}

export class CIC {
  static async health(): Promise<{ data: { health: HealthData } }> {
    const res = await fetch(`${API_URL}/cic/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    const health = await res.json();
    return { data: { health } };
  }

  static async pipelines(): Promise<{ data: Pipeline[] }> {
    const res = await fetch(`${API_URL}/cic/pipelines`);
    if (!res.ok) throw new Error(`Pipelines fetch failed: ${res.statusText}`);
    const data = await res.json();
    return { data };
  }

  static async alerts(): Promise<{ data: Alert[] }> {
    const res = await fetch(`${API_URL}/cic/alerts`);
    if (!res.ok) throw new Error(`Alerts fetch failed: ${res.statusText}`);
    const data = await res.json();
    return { data };
  }

  static async agents(): Promise<{ data: Agent[] }> {
    const res = await fetch(`${API_URL}/agents`);
    if (!res.ok) throw new Error(`Agents fetch failed: ${res.statusText}`);
    const data = await res.json();
    return { data };
  }

  static async workspace(): Promise<{ data: WorkspaceData }> {
    const res = await fetch(`${API_URL}/cic/workspace`);
    if (!res.ok) throw new Error(`Workspace fetch failed: ${res.statusText}`);
    const data = await res.json();
    return { data };
  }

  static async action(action: string, payload?: unknown): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/cic/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) throw new Error(`Action failed: ${res.statusText}`);
    return res.json();
  }

  static async getContext(id: string, traceId: string): Promise<{ data: { context: unknown } }> {
    const res = await fetch(`${API_URL}/cic/context/${id}?traceId=${traceId}`);
    if (!res.ok) throw new Error(`Get context failed: ${res.statusText}`);
    const context = await res.json();
    return { data: { context } };
  }

  static async metrics(): Promise<{ data: unknown }> {
    const res = await fetch(`${API_URL}/cic/metrics`);
    if (!res.ok) throw new Error(`Metrics fetch failed: ${res.statusText}`);
    const data = await res.json();
    return { data };
  }

  static async getFlowExecution(executionId: string): Promise<{ data: { execution: unknown } }> {
    const res = await fetch(`${API_URL}/cic/flows/${executionId}`);
    if (!res.ok) throw new Error(`Get flow execution failed: ${res.statusText}`);
    const execution = await res.json();
    return { data: { execution } };
  }

  static async executeFlow(flowId: string, payload: unknown, traceId: string): Promise<{ data: { execution_id: string } }> {
    const res = await fetch(`${API_URL}/cic/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, payload, traceId }),
    });
    if (!res.ok) throw new Error(`Execute flow failed: ${res.statusText}`);
    const { execution_id } = await res.json();
    return { data: { execution_id } };
  }
}
