import { runArl, ArlInput, Verdict } from '../src/reasoning/arl/index';

interface StabilityReport {
  timestamp: string;
  arl: {
    verdict: Verdict;
    trace: any[];
  };
}

export async function generateStabilityReport(
  arlInput: ArlInput
): Promise<StabilityReport> {
  const verdict = await runArl(arlInput);

  const report: StabilityReport = {
    timestamp: new Date().toISOString(),
    arl: {
      verdict,
      trace: verdict.reasoningTrace || [],
    },
  };

  return report;
}

export async function reportToOperatorDashboard(
  arlInput: ArlInput
): Promise<void> {
  const report = await generateStabilityReport(arlInput);

  // Expose trace to operator dashboard (CognitionPanel)
  console.log(
    JSON.stringify(
      {
        timestamp: report.timestamp,
        decision: report.arl.verdict.decision,
        confidence: report.arl.verdict.confidence,
        trace: report.arl.trace,
      },
      null,
      2
    )
  );
}
