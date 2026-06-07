/**
 * CIC Foreman HTTP Service (Phase 46.1)
 *
 * Local HTTP server exposing CIC task interface to Wayland.
 * Endpoints: POST /task, GET /status/:id, GET /artifact/:id/:artifact_id, GET /health
 * Binds to 127.0.0.1:3035
 */

import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

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

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, this.host, () => {
        console.log(`CIC Foreman listening on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
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
