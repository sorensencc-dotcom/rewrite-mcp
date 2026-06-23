import { MeeMemoryItem } from "./mee-schema.js";
export interface MeeMemoryStore {
    add(item: MeeMemoryItem): void;
    get(id: string): MeeMemoryItem | undefined;
    queryByTags(tags: string[]): MeeMemoryItem[];
    queryByJob(jobId: string): MeeMemoryItem[];
}
export declare class InMemoryMeeMemoryStore implements MeeMemoryStore {
    private items;
    add(item: MeeMemoryItem): void;
    get(id: string): MeeMemoryItem | undefined;
    queryByTags(tags: string[]): MeeMemoryItem[];
    queryByJob(jobId: string): MeeMemoryItem[];
}
export declare class FileMeeMemoryStore implements MeeMemoryStore {
    readonly baseDir: string;
    constructor(baseDir: string);
    memoryFile(): string;
    load(): MeeMemoryItem[];
    private saveAll;
    add(item: MeeMemoryItem): void;
    get(id: string): MeeMemoryItem | undefined;
    queryByTags(tags: string[]): MeeMemoryItem[];
    queryByJob(jobId: string): MeeMemoryItem[];
}
//# sourceMappingURL=mee-memory-store.d.ts.map