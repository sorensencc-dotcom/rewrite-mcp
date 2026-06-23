import { RunSummary } from '../contracts/RunSummary';
import { MultiRunAggregate } from '../contracts/MultiRunAggregate';
export declare class MultiRunAggregator {
    aggregate(runs: RunSummary[]): MultiRunAggregate;
    appendRun(existing: MultiRunAggregate, newRun: RunSummary): MultiRunAggregate;
    private computeStabilityScore;
    private detectTrend;
}
//# sourceMappingURL=MultiRunAggregator.d.ts.map