// File: projects/cic/ingestion/src/playbook/SimulationRunner.js | Date: 2026-05-31 | v1.0.0

/**
 * Replays simulated historical document flows through a mutated candidate playbook.
 * Performs a fast statistical Monte Carlo simulation (default N = 500 runs) using
 * rolling history distributions to estimate performance and verify SLO compliance.
 * 
 * @param {Object} candidate - The candidate playbook wrapper: { id, mutation, playbook }
 * @param {Array<Object>} telemetryWindow - Telemetry history from getRollingWindow()
 * @param {Object} currentPlaybook - The currently active playbook for relative delta baseline
 * @param {number} N - Number of simulation trials
 * @returns {Promise<Object>} Replay statistics and SLO compliance checks.
 */
export async function simulateCandidate(candidate, telemetryWindow = [], currentPlaybook = {}, N = 500) {
  const mutatedPb = candidate.playbook;
  
  // Extract statistical distribution parameters from telemetry window per extractor
  const stats = {};
  const fallbackStats = {
    SemanticExtractor: { accuracy: 0.90, latency: 150, drift: 0.02, contradictions: 0.01 },
    RelationshipExtractor: { accuracy: 0.82, latency: 280, drift: 0.05, contradictions: 0.08 },
    TopicExtractor: { accuracy: 0.88, latency: 90, drift: 0.01, contradictions: 0.02 },
    ImageAnalyzerV2: { accuracy: 0.85, latency: 310, drift: 0.04, contradictions: 0.03 }
  };

  // Group telemetry by extractor
  for (const item of telemetryWindow) {
    const name = item.extractor || item.skill_id || item.skillId;
    if (!name) continue;
    if (!stats[name]) {
      stats[name] = { accuracies: [], latencies: [], drifts: [], contradictions: [] };
    }
    const scores = item.scores || {};
    stats[name].accuracies.push(typeof item.accuracy === 'number' ? item.accuracy : (scores.accuracy / 100 || 0.85));
    stats[name].latencies.push(item.latency_ms || item.latencySummary?.p50Ms || scores.latency || 200);
    stats[name].drifts.push(item.drift_detected || item.driftDetected ? 1 : 0);
    stats[name].contradictions.push(typeof item.contradictionRate === 'number' ? item.contradictionRate : (item.contradictions || 0));
  }

  // Draw random samples from the telemetry window or fallback distributions
  const sampleMetric = (extractor, metric) => {
    const extStats = stats[extractor];
    if (extStats && extStats[metric + 's'] && extStats[metric + 's'].length > 0) {
      const arr = extStats[metric + 's'];
      return arr[Math.floor(Math.random() * arr.length)];
    }
    // Fallback distributions
    const defaults = fallbackStats[extractor] || { accuracy: 0.85, latency: 200, drift: 0.02, contradictions: 0.02 };
    const base = defaults[metric];
    // Add minor gaussian noise
    const noise = (Math.random() - 0.5) * (base * 0.1);
    return Math.max(0, base + noise);
  };

  // Run N trials for the mutated playbook AND the current playbook
  let sumMutatedLatency = 0;
  let sumMutatedAccuracy = 0;
  let sumMutatedDrift = 0;
  let sumMutatedContradiction = 0;
  let mutatedSloViolations = 0;

  let sumCurrentLatency = 0;
  let sumCurrentAccuracy = 0;
  let sumCurrentDrift = 0;
  let sumCurrentContradiction = 0;

  for (let i = 0; i < N; i++) {
    // ---- Simulate mutated playbook ----
    let mutLatency = 0;
    let mutAccuracyProduct = 1.0;
    let mutDriftCount = 0;
    let mutContradictions = 0;

    let parallelStages = [];
    let executedStagesCount = 0;

    // We process each stage in the playbook
    for (const stage of mutatedPb.stages || []) {
      const name = stage.name;
      
      // Check conditional gates
      let execute = true;
      if (stage.mode === 'conditional') {
        // e.g. requires: ["semantic.confidence > 0.85"]
        // In simulation, we check if prior SemanticExtractor accuracy is high
        const priorSemanticAccuracy = sampleMetric('SemanticExtractor', 'accuracy');
        if (priorSemanticAccuracy <= 0.85) {
          execute = false;
        }
      }

      if (!execute) {
        // Skip stage
        continue;
      }

      executedStagesCount++;
      const stageLatency = sampleMetric(name, 'latency');
      const stageAccuracy = sampleMetric(name, 'accuracy');
      const stageDrift = sampleMetric(name, 'drift');
      const stageContr = sampleMetric(name, 'contradictions');

      mutAccuracyProduct *= stageAccuracy;
      mutDriftCount += stageDrift;
      mutContradictions += stageContr;

      if (stage.mode === 'parallel') {
        parallelStages.push(stageLatency);
      } else {
        // Serial
        mutLatency += stageLatency;
      }
    }

    // Parallel latency is the max of the parallel stages group
    if (parallelStages.length > 0) {
      mutLatency += Math.max(...parallelStages) + 15; // 15ms orchestration overhead
    }

    sumMutatedLatency += mutLatency;
    // Average accuracy across active stages
    const mutAcc = executedStagesCount > 0 ? Math.pow(mutAccuracyProduct, 1 / executedStagesCount) : 0.8;
    sumMutatedAccuracy += mutAcc;
    sumMutatedDrift += (mutDriftCount > 0 ? 1 : 0);
    sumMutatedContradiction += mutContradictions;

    // Check SLO threshold: P95 latency > 500ms or accuracy < 0.6
    if (mutLatency > 500 || mutAcc < 0.6) {
      mutatedSloViolations++;
    }

    // ---- Simulate current active playbook ----
    let curLatency = 0;
    let curAccuracyProduct = 1.0;
    let curDriftCount = 0;
    let curContradictions = 0;
    let curExecutedCount = 0;

    for (const stage of currentPlaybook.stages || []) {
      curExecutedCount++;
      const name = stage.name;
      const stageLatency = sampleMetric(name, 'latency');
      const stageAccuracy = sampleMetric(name, 'accuracy');
      const stageDrift = sampleMetric(name, 'drift');
      const stageContr = sampleMetric(name, 'contradictions');

      curAccuracyProduct *= stageAccuracy;
      curDriftCount += stageDrift;
      curContradictions += stageContr;
      curLatency += stageLatency;
    }

    const curAcc = curExecutedCount > 0 ? Math.pow(curAccuracyProduct, 1 / curExecutedCount) : 0.8;
    sumCurrentLatency += curLatency;
    sumCurrentAccuracy += curAcc;
    sumCurrentDrift += (curDriftCount > 0 ? 1 : 0);
    sumCurrentContradiction += curContradictions;
  }

  const avgMutatedLatency = sumMutatedLatency / N;
  const avgMutatedAccuracy = sumMutatedAccuracy / N;
  const avgMutatedDrift = sumMutatedDrift / N;
  const avgMutatedContradiction = sumMutatedContradiction / N;

  const avgCurrentLatency = sumCurrentLatency / N;
  const avgCurrentAccuracy = sumCurrentAccuracy / N;
  const avgCurrentDrift = sumCurrentDrift / N;
  const avgCurrentContradiction = sumCurrentContradiction / N;

  // Compute deltas relative to current playbook
  const accuracyDelta = avgMutatedAccuracy - avgCurrentAccuracy;
  const latencyDelta = (avgMutatedLatency - avgCurrentLatency) / avgCurrentLatency; // Relative delta
  const driftDelta = avgMutatedDrift - avgCurrentDrift;
  const contradictionDelta = avgMutatedContradiction - avgCurrentContradiction;

  // The candidate passes the SLO check if SLO violation rate in simulations is below 2.0%
  const sloPass = (mutatedSloViolations / N) < 0.02;

  return {
    candidate: candidate.id,
    mutation: candidate.mutation,
    accuracyDelta: Math.round(accuracyDelta * 1000) / 1000,
    latencyDelta: Math.round(latencyDelta * 1000) / 1000,
    driftDelta: Math.round(driftDelta * 1000) / 1000,
    contradictionDelta: Math.round(contradictionDelta * 1000) / 1000,
    sloPass
  };
}

export default {
  simulateCandidate
};
