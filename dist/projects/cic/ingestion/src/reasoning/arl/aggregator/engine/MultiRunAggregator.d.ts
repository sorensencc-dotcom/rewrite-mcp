import { RunSummary } from '../contracts/RunSummary';
import { MultiRunAggregate } from '../contracts/MultiRunAggregate';
/**
 * Phase 7.16 — Multi-Run Aggregator
 * Evaluates reasoning across multiple expansions with rolling drift/stability analysis
 */
export declare class MultiRunAggregator {
    aggregate(runs: RunSummary[]): MultiRunAggregate;
    appendRun(_existing: MultiRunAggregate, _newRun: RunSummary): MultiRunAggregate;
    private average;
    private computeTrend;
    private computeStabilityScore;
}
//# sourceMappingURL=MultiRunAggregator.d.ts.map