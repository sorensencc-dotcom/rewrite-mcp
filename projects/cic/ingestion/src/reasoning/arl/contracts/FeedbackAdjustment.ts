export interface FeedbackAdjustment {
  driftAdjustment: number;
  thresholdAdjustments: {
    composite?: number;
    confidence?: number;
    drift?: number;
    contradiction?: number;
  };
  narrativeRiskAdjustment: number;
}
