// File: projects/cic/src/ckg/ckg-harvester.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { CkgStore, CkgNode, CkgEdge } from "./ckg-store.js";

export class CkgHarvester {
  constructor(
    private workspaceRoot: string,
    private store: CkgStore
  ) {}

  public run(): void {
    // 1. Harvest docs
    const docsDir = path.resolve(this.workspaceRoot, "docs/cic");
    if (fs.existsSync(docsDir)) {
      try {
        const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));
        for (const file of files) {
          const docId = `doc:${file.toLowerCase()}`;
          this.store.appendNode({
            id: docId,
            type: "doc",
            name: file,
            tags: ["documentation", "charlie"]
          });
        }
      } catch {}
    }

    // 2. Harvest Memory Layer
    const memoryLedgerPath = path.resolve(this.workspaceRoot, "projects/cic/data/memory-ledger.jsonl");
    if (fs.existsSync(memoryLedgerPath)) {
      try {
        const content = fs.readFileSync(memoryLedgerPath, "utf8");
        const lines = content.split("\n").filter(l => l.trim() !== "");
        for (const line of lines) {
          const event = JSON.parse(line);
          const eventNodeId = `memory:${event.id}`;
          this.store.appendNode({
            id: eventNodeId,
            type: "memory_event",
            name: event.type,
            tags: ["memory", event.type],
            meta: { timestamp: event.timestamp, payload: event.payload }
          });
        }
      } catch {}
    }

    // 3. Harvest Skill Graph
    const skillGraphPath = path.resolve(this.workspaceRoot, "projects/cic/skill-graph/graph.json");
    if (fs.existsSync(skillGraphPath)) {
      try {
        const graph = JSON.parse(fs.readFileSync(skillGraphPath, "utf8"));
        if (graph.nodes) {
          for (const node of graph.nodes) {
            const nodeId = node.id;
            this.store.appendNode({
              id: nodeId,
              type: node.type, // e.g. 'agent', 'skill', 'tool'
              name: node.name,
              tags: ["skills"]
            });
          }
        }
        if (graph.edges) {
          for (const edge of graph.edges) {
            this.store.appendEdge({
              from: edge.from,
              to: edge.to,
              type: edge.type // e.g. 'implements', 'depends_on'
            });
          }
        }
      } catch {}
    }

    // 4. Harvest APR Episodes
    const aprLogPath = path.resolve(this.workspaceRoot, "projects/cic/.apr/episodes.jsonl");
    if (fs.existsSync(aprLogPath)) {
      try {
        const content = fs.readFileSync(aprLogPath, "utf8");
        const lines = content.split("\n").filter(l => l.trim() !== "");
        for (const line of lines) {
          const ep = JSON.parse(line);
          const epNodeId = `apr:${ep.id}`;
          this.store.appendNode({
            id: epNodeId,
            type: "planning_episode",
            name: `Planning Episode ${ep.id}`,
            tags: ["apr", ep.status],
            meta: { timestamp: ep.timestamp }
          });

          // Link goals and tasks to this episode
          if (ep.decision?.plan?.goals) {
            for (const goal of ep.decision.plan.goals) {
              const goalNodeId = `goal:${goal.id}`;
              this.store.appendNode({
                id: goalNodeId,
                type: "task",
                name: goal.title,
                tags: ["apr", "goal", goal.priority],
                meta: { description: goal.description }
              });
              this.store.appendEdge({
                from: epNodeId,
                to: goalNodeId,
                type: "derived_from"
              });
            }
          }
        }
      } catch {}
    }

    // 5. Harvest CRO Episodes
    const croLogPath = path.resolve(this.workspaceRoot, "projects/cic/.cro/executions.jsonl");
    if (fs.existsSync(croLogPath)) {
      try {
        const content = fs.readFileSync(croLogPath, "utf8");
        const lines = content.split("\n").filter(l => l.trim() !== "");
        for (const line of lines) {
          const ep = JSON.parse(line);
          const epNodeId = `cro:${ep.id}`;
          this.store.appendNode({
            id: epNodeId,
            type: "execution_episode",
            name: `Execution Episode ${ep.id}`,
            tags: ["cro", ep.status],
            meta: { timestamp: ep.timestamp, stats: ep.stats }
          });

          if (ep.tasks) {
            for (const task of ep.tasks) {
              const taskNodeId = `execution_task:${task.taskId}`;
              this.store.appendNode({
                id: taskNodeId,
                type: "task",
                name: task.title,
                tags: ["cro", "task", task.status],
                meta: { owner: task.owner, retryCount: task.retryCount }
              });
              this.store.appendEdge({
                from: epNodeId,
                to: taskNodeId,
                type: "executes"
              });
            }
          }
        }
      } catch {}
    }
  }
}
