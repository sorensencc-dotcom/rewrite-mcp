import { ResearchFinding } from "./mee-schema.js";
export declare class FileMeeResearchFindingStore {
    private filePath;
    constructor(baseDir?: string);
    private ensureDir;
    private loadFile;
    private saveFile;
    loadAll(): ResearchFinding[];
    get(id: string): ResearchFinding | null;
    add(finding: ResearchFinding): void;
    update(id: string, partial: Partial<ResearchFinding>): void;
    saveAll(findings: ResearchFinding[]): void;
}
//# sourceMappingURL=mee-research-finding-store.d.ts.map