import { OperatorFeedback } from '../contracts/OperatorFeedback';
import { FeedbackAdjustment } from '../contracts/FeedbackAdjustment';
import { ThresholdConfig } from '../contracts/ThresholdConfig';
export declare class OperatorFeedbackLoop {
    private readonly maxAdjustmentPerRun;
    private readonly adjustmentBounds;
    computeAdjustments(feedback: OperatorFeedback[]): FeedbackAdjustment;
    applyAdjustments(config: ThresholdConfig, adjustment: FeedbackAdjustment): ThresholdConfig;
    private computeAdjustmentDirection;
    private boundAdjustment;
}
//# sourceMappingURL=OperatorFeedbackLoop.d.ts.map