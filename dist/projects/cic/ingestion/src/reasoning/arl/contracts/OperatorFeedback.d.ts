export interface OperatorFeedback {
    id: string;
    timestamp: string;
    originalVerdict: 'ACCEPT' | 'QUARANTINE' | 'REJECT';
    operatorVerdict: 'ACCEPT' | 'QUARANTINE' | 'REJECT';
    reason: string;
}
//# sourceMappingURL=OperatorFeedback.d.ts.map