/**
 * CRG Adapter
 * Translates code-review-graph (CRG) structural data into Context API format
 */

import { Context, ContextFile, ContextSlice } from "../context-service/ContextService";

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
  /**
   * Convert CRG codebase snapshot to Context
   */
  static fromCodebase(
    codebase: CRGCodebase,
    traceId: string
  ): Context {
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
  private static fileToContextFile(
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
      });
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
      });

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
        });
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
  private static findCallers(
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
   * Extract slice content from source code
   * (placeholder; actual implementation queries source repository)
   */
  static async loadSliceContent(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<string> {
    // TODO: Fetch from CRG source store or git backend
    // For now, return placeholder
    return `[content for ${filePath}:${startLine}-${endLine}]`;
  }
}

export default CRGAdapter;
