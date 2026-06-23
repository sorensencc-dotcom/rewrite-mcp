export interface MemoryEvent {
    id: string;
    type: string;
    timestamp: string;
    payload: any;
}
export declare class MemorySubstrate {
    private ledgerPath;
    constructor(ledgerPath: string);
    append(event: MemoryEvent): void;
    query(filter: {
        type?: string;
    }): MemoryEvent[];
    snapshot(): any;
}
