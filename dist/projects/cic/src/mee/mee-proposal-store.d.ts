import { PhaseProposal } from "./mee-schema.js";
export declare class MeeProposalStore {
    private filePath;
    constructor(baseDir?: string);
    private ensureDir;
    private loadFile;
    private saveFile;
    loadAll(): PhaseProposal[];
    get(id: string): PhaseProposal | null;
    add(proposal: PhaseProposal): void;
    update(id: string, partial: Partial<PhaseProposal>): void;
    saveAll(proposals: PhaseProposal[]): void;
}
//# sourceMappingURL=mee-proposal-store.d.ts.map