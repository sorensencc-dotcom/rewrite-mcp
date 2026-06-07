import { OperatorFeedback } from '../contracts/OperatorFeedback';
import { FeedbackAdjustment } from '../contracts/FeedbackAdjustment';
import { ThresholdConfig } from '../contracts/ThresholdConfig';

export class OperatorFeedbackLoop {
  private readonly maxAdjustmentPerRun = 0.1;
  private readonly adjustmentBounds = { min: -0.2, max: 0.2 };

  computeAdjustments(feedback: OperatorFeedback[]): FeedbackAdjustment {
    if (feedback.length === 0) {
      return {
        driftAdjustment: 0,
        thresholdAdjustments: {
          composite: 0,
          confidence: 0,
          drift: 0,
          contradiction: 0,
        },
        narrativeRiskAdjustment: 0,
      };
    }

    let driftAdjustment = 0;
    let narrativeRiskAdjustment = 0;
    const thresholdAdjustments: Record<string, number> = {
      composite: 0,
      confidence: 0,
      drift: 0,
      contradiction: 0,
    };

    for (const fb of feedback) {
      if (fb.originalVerdict === 'REJECT' && fb.operatorVerdict === 'ACCEPT') {
        thresholdAdjustments.composite += this.maxAdjustmentPerRun;
        thresholdAdjustments.confidence += this.maxAdjustmentPerRun;
        driftAdjustment += this.maxAdjustmentPerRun * 0.5;
      } else if (
        fb.originalVerdict === 'ACCEPT' &&
        fb.operatorVerdict === 'REJECT'
      ) {
        thresholdAdjustments.composite -= this.maxAdjustmentPerRun;
        thresholdAdjustments.confidence -= this.maxAdjustmentPerRun;
        driftAdjustment -= this.maxAdjustmentPerRun * 0.5;
      }

      if (fb.originalVerdict === 'REJECT' && fb.operatorVerdict === 'QUARANTINE') {
        thresholdAdjustments.drift += this.maxAdjustmentPerRun;
        thresholdAdjustments.contradiction += this.maxAdjustmentPerRun;
      }

      narrativeRiskAdjustment += this.computeAdjustmentDirection(fb) * (this.maxAdjustmentPerRun * 0.3);
    }

    return {
      driftAdjustment: this.boundAdjustment(driftAdjustment),
      thresholdAdjustments: {
        composite: this.boundAdjustment(thresholdAdjustments.composite),
        confidence: this.boundAdjustment(thresholdAdjustments.confidence),
        drift: this.boundAdjustment(thresholdAdjustments.drift),
        contradiction: this.boundAdjustment(
          thresholdAdjustments.contradiction
        ),
      },
      narrativeRiskAdjustment: this.boundAdjustment(narrativeRiskAdjustment),
    };
  }

  applyAdjustments(
    config: ThresholdConfig,
    adjustment: FeedbackAdjustment
  ): ThresholdConfig {
    const result = { ...config };

    if (adjustment.thresholdAdjustments.composite !== undefined) {
      result.compositeReasoningMin = Math.max(
        0,
        Math.min(
          1,
          result.compositeReasoningMin +
            adjustment.thresholdAdjustments.composite
        )
      );
    }

    if (adjustment.thresholdAdjustments.confidence !== undefined) {
      result.confidenceMin = Math.max(
        0,
        Math.min(1, result.confidenceMin + adjustment.thresholdAdjustments.confidence)
      );
    }

    if (adjustment.thresholdAdjustments.drift !== undefined) {
      result.driftMaxMagnitude = Math.max(
        0,
        Math.min(
          1,
          result.driftMaxMagnitude + adjustment.thresholdAdjustments.drift
        )
      );
    }

    if (adjustment.thresholdAdjustments.contradiction !== undefined) {
      result.contradictionSeverityMax = Math.max(
        0,
        Math.min(
          1,
          result.contradictionSeverityMax +
            adjustment.thresholdAdjustments.contradiction
        )
      );
    }

    return result;
  }

  private computeAdjustmentDirection(feedback: OperatorFeedback): number {
    if (
      feedback.originalVerdict === 'REJECT' &&
      feedback.operatorVerdict === 'ACCEPT'
    ) {
      return 1;
    } else if (
      feedback.originalVerdict === 'ACCEPT' &&
      feedback.operatorVerdict === 'REJECT'
    ) {
      return -1;
    } else {
      return 0;
    }
  }

  private boundAdjustment(adjustment: number): number {
    return Math.max(
      this.adjustmentBounds.min,
      Math.min(this.adjustmentBounds.max, adjustment)
    );
  }
}
