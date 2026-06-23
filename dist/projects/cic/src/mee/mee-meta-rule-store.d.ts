import { MeeMetaRule } from "./mee-schema.js";
export declare class FileMeeMetaRuleStore {
    private filePath;
    constructor(baseDir?: string);
    private ensureDir;
    private loadFile;
    private saveFile;
    loadAll(): MeeMetaRule[];
    get(id: string): MeeMetaRule | null;
    add(rule: MeeMetaRule): void;
    update(id: string, partial: Partial<MeeMetaRule>): void;
    saveAll(rules: MeeMetaRule[]): void;
}
//# sourceMappingURL=mee-meta-rule-store.d.ts.map