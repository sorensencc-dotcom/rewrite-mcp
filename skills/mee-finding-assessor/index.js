export async function meeFindingAssessor(params) {
  const startTime = Date.now();
  try {
    if (!params?.findings?.length) throw new Error('findings required');
    const weights = { confidenceWeight: 0.3, impactWeight: 0.4, effortWeight: 0.3, ...params.scoringWeights };
    const sum = weights.confidenceWeight + weights.impactWeight + weights.effortWeight;
    ['confidenceWeight', 'impactWeight', 'effortWeight'].forEach(k => { weights[k] /= sum; });

    const assessed = params.findings.map((f, i) => {
      const baseScore = f.confidence * weights.confidenceWeight + f.impact * weights.impactWeight + Math.max(0, 1 - (f.effort || 50) / 100) * weights.effortWeight;
      const contextBoost = Math.min(0.5, (f.type === 'bug' ? 0.15 : 0) + (f.type === 'performance' ? 0.1 : 0));
      const finalScore = Math.min(1, baseScore * (1 + contextBoost));
      return { ...f, assessment: { baseScore: +baseScore.toFixed(3), contextBoost: +contextBoost.toFixed(3), finalScore: +finalScore.toFixed(3), rank: i + 1, recommendation: finalScore >= 0.75 ? 'approve' : finalScore >= 0.5 ? 'review' : 'reject', rationale: 'Assessment applied' } };
    });
    assessed.sort((a, b) => b.assessment.finalScore - a.assessment.finalScore);
    assessed.forEach((f, i) => { f.assessment.rank = i + 1; });
    const selected = assessed.slice(0, params.returnTopN || 10);
    return { success: true, assessmentId: `assess-${Date.now()}`, findings: selected, skippedFindings: assessed.length - selected.length, summary: { totalAssessed: params.findings.length, totalSelected: selected.length, recommendCount: selected.filter(f => f.assessment.recommendation === 'approve').length }, stats: { averageScore: (selected.reduce((s, f) => s + f.assessment.finalScore, 0) / selected.length).toFixed(3), topScore: selected[0]?.assessment.finalScore || 0 }, elapsedMs: Date.now() - startTime };
  } catch (error) {
    return { success: false, error: error.message, assessmentId: 'error-' + Date.now(), elapsedMs: Date.now() - startTime };
  }
}
