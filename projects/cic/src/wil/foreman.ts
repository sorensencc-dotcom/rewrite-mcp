/**
 * CIC Foreman HTTP Service (Phase 46.1)
 * with Wayland Registry Integration (Phase 46.3)
 *
 * Local HTTP server exposing CIC task interface to Wayland.
 * Endpoints: POST /task, GET /status/:id, GET /artifact/:id/:artifact_id, GET /health
 * Binds to 127.0.0.1:3035
 *
 * Registers with Wayland agent registry on startup.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import SessionMapper from './session-mapper';

export interface Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  phase?: string;
  error?: string;
  artifacts: Array<{ id: string; path: string; size: number }>;
}

export class CICForeman {
  private tasks: Map<string, Task> = new Map();
  private server?: http.Server;
  private port = 3035;
  private host = '127.0.0.1';
  private registryUrl = process.env.WAYLAND_REGISTRY_URL || 'http://127.0.0.1:4000';
  private agentId = 'cic-foreman-wil-v1';
  private registrationId?: string;
  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatIntervalMs = 30000;
  private sessionMapper = new SessionMapper();
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, this.host, async () => {
        console.log(`CIC Foreman listening on ${this.host}:${this.port}`);
        await this.registerWithWaylandRegistry();
        this.startHeartbeat();
        resolve();
      });
    });
  }

  private async registerWithWaylandRegistry(): Promise<void> {
    try {
      const manifestPath = path.join(__dirname, '../../cic_foreman.agent.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      manifest.endpoints.http = `http://${this.host}:${this.port}`;

      const response = await this.makeHttpRequest('POST', `${this.registryUrl}/agents/register`, manifest);
      this.registrationId = response.registration_id;

      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        event: 'wayland_registry_registered',
        agentId: this.agentId,
        registrationId: this.registrationId,
        registryUrl: this.registryUrl
      }));
    } catch (error) {
      console.log(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        event: 'wayland_registry_registration_failed',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch((error) => {
        console.log(JSON.stringify({
          level: 'warn',
          timestamp: new Date().toISOString(),
          event: 'wayland_registry_heartbeat_failed',
          error: error instanceof Error ? error.message : String(error)
        }));
      });
    }, this.heartbeatIntervalMs);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.registrationId) return;
    try {
      await this.makeHttpRequest('POST', `${this.registryUrl}/agents/${this.registrationId}/heartbeat`, {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        taskCount: this.tasks.size
      });
    } catch (error) {
      // Silent fail on heartbeat
    }
  }

  private makeHttpRequest(method: string, url: string, body?: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const requestUrl = new URL(url);
        const options: http.RequestOptions = {
          method,
          hostname: requestUrl.hostname,
          port: requestUrl.port,
          path: requestUrl.pathname + requestUrl.search,
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data || '{}'));
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      if (this.registrationId) {
        try {
          await this.makeHttpRequest('POST', `${this.registryUrl}/agents/${this.registrationId}/deregister`, {});
          console.log(JSON.stringify({
            level: 'info',
            timestamp: new Date().toISOString(),
            event: 'wayland_registry_deregistered',
            registrationId: this.registrationId
          }));
        } catch (error) {
          console.log(JSON.stringify({
            level: 'warn',
            timestamp: new Date().toISOString(),
            event: 'wayland_registry_deregistration_failed',
            error: error instanceof Error ? error.message : String(error)
          }));
        }
      }

      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const correlationId = uuidv4();
    const startTime = Date.now();

    // Log incoming request
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      correlationId,
      method: req.method,
      path: req.url,
      event: 'request_received'
    }));

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);

    try {
      if (req.method === 'POST' && url.pathname === '/task') {
        this.handlePostTask(req, res, correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname.startsWith('/status/')) {
        const taskId = url.pathname.split('/').pop();
        this.handleGetStatus(res, taskId || '', correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname.startsWith('/artifact/')) {
        const parts = url.pathname.split('/');
        this.handleGetArtifact(res, parts[2] || '', parts[3] || '', correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname === '/health') {
        this.handleHealth(res, correlationId, startTime);
      } else if (req.method === 'POST' && url.pathname === '/session') {
        this.handleCreateSession(req, res, correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname.startsWith('/session/')) {
        const parts = url.pathname.split('/');
        this.handleGetSession(res, parts[2] || '', correlationId, startTime);
      } else if (req.method === 'POST' && url.pathname.startsWith('/session/') && url.pathname.endsWith('/event')) {
        const parts = url.pathname.split('/');
        this.handleSessionEvent(req, res, parts[2] || '', correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname.startsWith('/session/') && url.pathname.endsWith('/stats')) {
        const parts = url.pathname.split('/');
        this.handleGetSessionStats(res, parts[2] || '', correlationId, startTime);
      } else if (req.method === 'GET' && url.pathname === '/events') {
        this.handleEventsStream(req, res, correlationId);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.log(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        event: 'request_error'
      }));

      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private handlePostTask(req: http.IncomingMessage, res: http.ServerResponse, correlationId: string, startTime: number): void {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const task: Task = {
          id: uuidv4(),
          status: 'pending',
          createdAt: new Date().toISOString(),
          phase: payload.phase,
          artifacts: []
        };
        this.tasks.set(task.id, task);

        console.log(JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          correlationId,
          taskId: task.id,
          phase: task.phase,
          elapsedMs: Date.now() - startTime,
          event: 'task_created'
        }));

        res.writeHead(201);
        res.end(JSON.stringify(task));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
  }

  private handleGetStatus(res: http.ServerResponse, taskId: string, correlationId: string, startTime: number): void {
    const task = this.tasks.get(taskId);

    if (!task) {
      console.log(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        correlationId,
        taskId,
        event: 'task_not_found'
      }));
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
      return;
    }

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      correlationId,
      taskId,
      status: task.status,
      elapsedMs: Date.now() - startTime,
      event: 'status_retrieved'
    }));

    res.writeHead(200);
    res.end(JSON.stringify(task));
  }

  private handleGetArtifact(res: http.ServerResponse, taskId: string, artifactId: string, correlationId: string, startTime: number): void {
    const task = this.tasks.get(taskId);

    if (!task) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
      return;
    }

    const artifact = task.artifacts.find((a) => a.id === artifactId);

    if (!artifact) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Artifact not found' }));
      return;
    }

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      correlationId,
      taskId,
      artifactId,
      size: artifact.size,
      elapsedMs: Date.now() - startTime,
      event: 'artifact_retrieved'
    }));

    res.writeHead(200);
    res.end(JSON.stringify(artifact));
  }

  private handleHealth(res: http.ServerResponse, correlationId: string, startTime: number): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      tasks: {
        total: this.tasks.size,
        pending: Array.from(this.tasks.values()).filter((t) => t.status === 'pending').length,
        running: Array.from(this.tasks.values()).filter((t) => t.status === 'running').length,
        completed: Array.from(this.tasks.values()).filter((t) => t.status === 'completed').length,
        failed: Array.from(this.tasks.values()).filter((t) => t.status === 'failed').length
      }
    };

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      correlationId,
      health: health.status,
      tasksTotal: health.tasks.total,
      elapsedMs: Date.now() - startTime,
      event: 'health_check'
    }));

    res.writeHead(200);
    res.end(JSON.stringify(health));
  }

  private handleCreateSession(req: http.IncomingMessage, res: http.ServerResponse, correlationId: string, startTime: number): void {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const session = this.sessionMapper.createSession(payload.pipeline_id || 'default');

        console.log(JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          correlationId,
          sessionId: session.session_id,
          pipelineId: session.pipeline_id,
          event: 'session_created'
        }));

        res.writeHead(201);
        res.end(JSON.stringify(session));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
  }

  private handleGetSession(res: http.ServerResponse, sessionId: string, correlationId: string, startTime: number): void {
    const session = this.sessionMapper.getSession(sessionId);

    if (!session) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(session));
  }

  private handleSessionEvent(req: http.IncomingMessage, res: http.ServerResponse, sessionId: string, correlationId: string, startTime: number): void {
    const session = this.sessionMapper.getSession(sessionId);
    if (!session) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);

        if (event.event_type === 'step.start') {
          this.sessionMapper.emitStepStart(sessionId, event.step_name, event.step_index);
        } else if (event.event_type === 'step.end') {
          this.sessionMapper.emitStepEnd(sessionId, event.step_name, event.duration_ms, event.status);
        } else if (event.event_type === 'step.error') {
          this.sessionMapper.emitStepError(sessionId, event.step_name, event.error);
        } else if (event.event_type === 'governance.decision') {
          this.sessionMapper.emitGovernanceDecision(sessionId, event.decision);
        } else if (event.event_type === 'tool.call') {
          this.sessionMapper.emitToolCall(sessionId, event.tool_call);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ status: 'accepted' }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid event' }));
      }
    });
  }

  private handleGetSessionStats(res: http.ServerResponse, sessionId: string, correlationId: string, startTime: number): void {
    const stats = this.sessionMapper.getSessionStats(sessionId);

    if (!stats || Object.keys(stats).length === 0) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(stats));
  }

  private handleEventsStream(req: http.IncomingMessage, res: http.ServerResponse, correlationId: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const eventHandler = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    this.sessionMapper.on('event', eventHandler);

    req.on('close', () => {
      this.sessionMapper.removeListener('event', eventHandler);
      res.end();
    });
  }
}

// CLI entry point
if (require.main === module) {
  const foreman = new CICForeman();
  foreman.start().catch(console.error);

  process.on('SIGTERM', () => {
    foreman.stop().then(() => process.exit(0));
  });
}

export default CICForeman;
