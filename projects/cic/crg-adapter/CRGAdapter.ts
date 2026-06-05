/**
 * CRG Adapter
 * Translates code-review-graph (CRG) structural data into Context API format
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Context, ContextFile, ContextSlice } from "../context-service/ContextService";

const exec = promisify(execFile);

/**
 * CRG structural types (simplified; full types in CRG repo)
 */
export interface CRGFile {
  path: string;
  language: string;
  functions: CRGFunction[];
  classes: CRGClass[];
  imports: { module: string; items: string[] }[];
}

export interface CRGFunction {
  name: string;
  startLine: number;
  endLine: number;
  calls: string[]; // fully qualified names
  calledBy: string[];
  tags: string[];
}

export interface CRGClass {
  name: string;
  startLine: number;
  endLine: number;
  methods: CRGFunction[];
  tags: string[];
}

export interface CRGCodebase {
  repo: string;
  branch: string;
  commit: string;
  files: CRGFile[];
  callGraph: Record<string, string[]>; // fqn -> [called fqn]
}

/**
 * CRGAdapter translates CRG structural data into Context API format
 */
export class CRGAdapter {
  private repoPath: string;
  private crgGraphCache: Map<string, CRGCodebase> = new Map();
  private sliceContentCache: Map<string, string> = new Map();

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * Load CRG graph from codebase (via CRG CLI or graph.json)
   */
  async loadGraph(commit?: string): Promise<CRGCodebase> {
    try {
      // Try cached version first
      const cacheKey = commit || "HEAD";
      if (this.crgGraphCache.has(cacheKey)) {
        return this.crgGraphCache.get(cacheKey)!;
      }

      // Try reading from projects/cic/ckg/graph.json (test data)
      const graphPath = path.join(this.repoPath, "projects/cic/ckg/graph.json");
      if (fs.existsSync(graphPath)) {
        const graph = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
        this.crgGraphCache.set(cacheKey, graph);
        return graph;
      }

      // Fallback: call CRG CLI if available
      try {
        const { stdout } = await exec("code-review-graph", [
          "export",
          "--format",
          "json",
          "--repo",
          this.repoPath,
          ...(commit ? ["--commit", commit] : []),
        ]);
        const graph = JSON.parse(stdout);
        this.crgGraphCache.set(cacheKey, graph);
        return graph;
      } catch (cliError) {
        // Return minimal synthetic graph if CRG unavailable
        return this.synthesizeMinimalGraph();
      }
    } catch (error) {
      throw new Error(`Failed to load CRG graph: ${error}`);
    }
  }

  /**
   * Get minimal context for targets (files or functions)
   */
  async getMinimalContext(targets: string[], traceId: string): Promise<Context> {
    const graph = await this.loadGraph();

    // Filter graph to only requested targets
    const filteredFiles = graph.files.filter((file) =>
      targets.some((target) => file.path.includes(target) || target === "*")
    );

    const filteredCodebase: CRGCodebase = {
      ...graph,
      files: filteredFiles,
    };

    return this.fromCodebase(filteredCodebase, traceId);
  }

  /**
   * Convert CRG codebase snapshot to Context
   */
  private fromCodebase(codebase: CRGCodebase, traceId: string): Context {
    const files = codebase.files.map((file) =>
      this.fileToContextFile(file, codebase.callGraph)
    );

    return {
      id: `ctx-${codebase.commit}`,
      type: "code",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      code: {
        repo: codebase.repo,
        branch: codebase.branch,
        commit: codebase.commit,
        files,
      },
      minimal: {
        repo: codebase.repo,
        commit: codebase.commit,
      },
      trace_id: traceId,
    };
  }

  /**
   * Convert CRG file to ContextFile (with lazy slices)
   */
  private fileToContextFile(
    file: CRGFile,
    callGraph: Record<string, string[]>
  ): ContextFile {
    const slices: ContextSlice[] = [];

    // Convert functions to slices
    for (const func of file.functions) {
      const fqn = `${file.path}:${func.name}`;
      slices.push({
        id: `${file.path}:${func.name}:${func.startLine}-${func.endLine}`,
        type: "function",
        start_line: func.startLine,
        end_line: func.endLine,
        tags: func.tags || [],
        calls: callGraph[fqn] || [],
        called_by: this.findCallers(fqn, callGraph),
      } as ContextSlice);
    }

    // Convert classes and methods
    for (const cls of file.classes) {
      // Class slice
      slices.push({
        id: `${file.path}:${cls.name}:${cls.startLine}-${cls.endLine}`,
        type: "class",
        start_line: cls.startLine,
        end_line: cls.endLine,
        tags: cls.tags || [],
        calls: [],
        called_by: [],
      } as ContextSlice);

      // Method slices
      for (const method of cls.methods) {
        const fqn = `${file.path}:${cls.name}.${method.name}`;
        slices.push({
          id: `${file.path}:${cls.name}.${method.name}:${method.startLine}-${method.endLine}`,
          type: "function",
          start_line: method.startLine,
          end_line: method.endLine,
          tags: method.tags || [],
          calls: callGraph[fqn] || [],
          called_by: this.findCallers(fqn, callGraph),
        } as ContextSlice);
      }
    }

    // Parse imports
    const imports = file.imports.map((imp) => imp.module);
    const importedBy: string[] = []; // TODO: compute from call graph

    return {
      path: file.path,
      language: file.language,
      slices,
      imports,
      imported_by: importedBy,
    };
  }

  /**
   * Find all callers of a function in the call graph
   */
  private findCallers(
    fqn: string,
    callGraph: Record<string, string[]>
  ): string[] {
    const callers: string[] = [];
    for (const [caller, callees] of Object.entries(callGraph)) {
      if (callees.includes(fqn)) {
        callers.push(caller);
      }
    }
    return callers;
  }

  /**
   * Load slice content from source code (lazy loading)
   */
  async loadSliceContent(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<string> {
    const cacheKey = `${filePath}:${startLine}-${endLine}`;

    // Return cached content
    if (this.sliceContentCache.has(cacheKey)) {
      return this.sliceContentCache.get(cacheKey)!;
    }

    try {
      // Try reading from filesystem
      const fullPath = path.join(this.repoPath, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const sliceLines = lines.slice(startLine - 1, endLine);
        const sliceContent = sliceLines.join("\n");

        // Cache it
        this.sliceContentCache.set(cacheKey, sliceContent);
        return sliceContent;
      }

      // Fallback: try git show
      try {
        const { stdout } = await exec("git", [
          "show",
          `HEAD:${filePath}`,
        ]);
        const lines = stdout.split("\n");
        const sliceLines = lines.slice(startLine - 1, endLine);
        const sliceContent = sliceLines.join("\n");
        this.sliceContentCache.set(cacheKey, sliceContent);
        return sliceContent;
      } catch {
        return `[slice ${filePath}:${startLine}-${endLine} not available]`;
      }
    } catch (error) {
      throw new Error(
        `Failed to load slice content: ${filePath}:${startLine}-${endLine}`
      );
    }
  }

  /**
   * Synthesize minimal graph for testing when CRG unavailable
   */
  private synthesizeMinimalGraph(): CRGCodebase {
    return {
      repo: this.repoPath,
      branch: "main",
      commit: "synthetic",
      files: [
        {
          path: "src/index.ts",
          language: "typescript",
          functions: [
            {
              name: "main",
              startLine: 1,
              endLine: 10,
              calls: ["helper"],
              calledBy: [],
              tags: ["entry"],
            },
          ],
          classes: [],
          imports: [],
        },
      ],
      callGraph: {
        "src/index.ts:main": ["src/index.ts:helper"],
      },
    };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.crgGraphCache.clear();
    this.sliceContentCache.clear();
  }
}

export default CRGAdapter;
