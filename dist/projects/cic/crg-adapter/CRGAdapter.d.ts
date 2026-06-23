/**
 * CRG Adapter
 * Translates code-review-graph (CRG) structural data into Context API format
 */
import { Context } from "../context-service/ContextService";
/**
 * CRG structural types (simplified; full types in CRG repo)
 */
export interface CRGFile {
    path: string;
    language: string;
    functions: CRGFunction[];
    classes: CRGClass[];
    imports: {
        module: string;
        items: string[];
    }[];
}
export interface CRGFunction {
    name: string;
    startLine: number;
    endLine: number;
    calls: string[];
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
    callGraph: Record<string, string[]>;
}
/**
 * CRGAdapter translates CRG structural data into Context API format
 */
export declare class CRGAdapter {
    private repoPath;
    private crgGraphCache;
    private sliceContentCache;
    constructor(repoPath: string);
    /**
     * Load CRG graph from codebase (via CRG CLI or graph.json)
     */
    loadGraph(commit?: string): Promise<CRGCodebase>;
    /**
     * Get minimal context for targets (files or functions)
     */
    getMinimalContext(targets: string[], traceId: string): Promise<Context>;
    /**
     * Convert CRG codebase snapshot to Context
     */
    private fromCodebase;
    /**
     * Convert CRG file to ContextFile (with lazy slices)
     */
    private fileToContextFile;
    /**
     * Find all callers of a function in the call graph
     */
    private findCallers;
    /**
     * Find files that import a given file path via call graph references
     */
    private findImporters;
    /**
     * Load slice content from source code (lazy loading)
     */
    loadSliceContent(filePath: string, startLine: number, endLine: number): Promise<string>;
    /**
     * Synthesize minimal graph for testing when CRG unavailable
     */
    private synthesizeMinimalGraph;
    /**
     * Clear caches
     */
    clearCaches(): void;
}
export default CRGAdapter;
//# sourceMappingURL=CRGAdapter.d.ts.map