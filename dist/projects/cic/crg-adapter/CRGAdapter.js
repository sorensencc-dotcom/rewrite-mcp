"use strict";
/**
 * CRG Adapter
 * Translates code-review-graph (CRG) structural data into Context API format
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRGAdapter = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const exec = (0, node_util_1.promisify)(node_child_process_1.execFile);
/**
 * CRGAdapter translates CRG structural data into Context API format
 */
class CRGAdapter {
    constructor(repoPath) {
        this.crgGraphCache = new Map();
        this.sliceContentCache = new Map();
        this.repoPath = repoPath;
    }
    /**
     * Load CRG graph from codebase (via CRG CLI or graph.json)
     */
    async loadGraph(commit) {
        try {
            // Try cached version first
            const cacheKey = commit || "HEAD";
            if (this.crgGraphCache.has(cacheKey)) {
                return this.crgGraphCache.get(cacheKey);
            }
            // Try reading from projects/cic/ckg/graph.json (test data)
            const graphPath = node_path_1.default.join(this.repoPath, "projects/cic/ckg/graph.json");
            if (node_fs_1.default.existsSync(graphPath)) {
                const graph = JSON.parse(node_fs_1.default.readFileSync(graphPath, "utf-8"));
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
            }
            catch (cliError) {
                // Return minimal synthetic graph if CRG unavailable
                return this.synthesizeMinimalGraph();
            }
        }
        catch (error) {
            throw new Error(`Failed to load CRG graph: ${error}`);
        }
    }
    /**
     * Get minimal context for targets (files or functions)
     */
    async getMinimalContext(targets, traceId) {
        const graph = await this.loadGraph();
        // Filter graph to only requested targets
        const filteredFiles = graph.files.filter((file) => targets.some((target) => file.path.includes(target) || target === "*"));
        const filteredCodebase = {
            ...graph,
            files: filteredFiles,
        };
        return this.fromCodebase(filteredCodebase, traceId);
    }
    /**
     * Convert CRG codebase snapshot to Context
     */
    fromCodebase(codebase, traceId) {
        const files = codebase.files.map((file) => this.fileToContextFile(file, codebase.callGraph));
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
    fileToContextFile(file, callGraph) {
        const slices = [];
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
        const importedBy = this.findImporters(file.path, callGraph);
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
    findCallers(fqn, callGraph) {
        const callers = [];
        for (const [caller, callees] of Object.entries(callGraph)) {
            if (callees.includes(fqn)) {
                callers.push(caller);
            }
        }
        return callers;
    }
    /**
     * Find files that import a given file path via call graph references
     */
    findImporters(filePath, callGraph) {
        const importers = new Set();
        for (const [caller, callees] of Object.entries(callGraph)) {
            const callerFile = caller.split(":")[0];
            if (callerFile === filePath)
                continue;
            for (const callee of callees) {
                if (callee.startsWith(filePath + ":")) {
                    importers.add(callerFile);
                }
            }
        }
        return Array.from(importers);
    }
    /**
     * Load slice content from source code (lazy loading)
     */
    async loadSliceContent(filePath, startLine, endLine) {
        const cacheKey = `${filePath}:${startLine}-${endLine}`;
        // Return cached content
        if (this.sliceContentCache.has(cacheKey)) {
            return this.sliceContentCache.get(cacheKey);
        }
        try {
            // Try reading from filesystem
            const fullPath = node_path_1.default.join(this.repoPath, filePath);
            if (node_fs_1.default.existsSync(fullPath)) {
                const content = node_fs_1.default.readFileSync(fullPath, "utf-8");
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
            }
            catch {
                return `[slice ${filePath}:${startLine}-${endLine} not available]`;
            }
        }
        catch (error) {
            throw new Error(`Failed to load slice content: ${filePath}:${startLine}-${endLine}`);
        }
    }
    /**
     * Synthesize minimal graph for testing when CRG unavailable
     */
    synthesizeMinimalGraph() {
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
    clearCaches() {
        this.crgGraphCache.clear();
        this.sliceContentCache.clear();
    }
}
exports.CRGAdapter = CRGAdapter;
exports.default = CRGAdapter;
//# sourceMappingURL=CRGAdapter.js.map