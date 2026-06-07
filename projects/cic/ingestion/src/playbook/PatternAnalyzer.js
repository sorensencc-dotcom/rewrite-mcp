// File: projects/cic/ingestion/src/playbook/PatternAnalyzer.js | Date: 2026-05-31 | v1.0.0

/**
 * Performs pattern analysis over a set of extractor feature vectors.
 * Detects bottlenecks, parallel candidates, low-impact prunes, and drift clusters.
 * 
 * @param {Array<Object>} featureVectors - Normalised feature vectors from TelemetryIngestor
 * @returns {Object} Analysis results: { bottlenecks, parallelCandidates, skipCandidates, driftClusters }
 */
export function analyzePatterns(featureVectors = []) {
  if (!featureVectors || featureVectors.length === 0) {
    return {
      bottlenecks: [],
      parallelCandidates: [],
      skipCandidates: [],
      driftClusters: []
    };
  }

  const bottlenecks = [];
  const parallelCandidates = [];
  const skipCandidates = [];
  const driftClusters = [];

  // 1. Z-score anomaly detection for latency
  const latencies = featureVectors.map(v => v.latencyP95);
  const n = latencies.length;
  
  if (n > 1) {
    const mean = latencies.reduce((sum, val) => sum + val, 0) / n;
    const variance = latencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    for (const v of featureVectors) {
      // If stdDev is negligible, fallback to static threshold (e.g. latencyP95 > 400ms)
      const zScore = stdDev > 5 ? (v.latencyP95 - mean) / stdDev : 0;
      
      if (zScore > 1.2 || v.latencyP95 > 400) {
        bottlenecks.push(v.extractor);
      }
    }
  } else if (n === 1 && featureVectors[0].latencyP95 > 400) {
    bottlenecks.push(featureVectors[0].extractor);
  }

  // 2. Latency-accuracy Pareto frontier & Skip candidates (low value extractors)
  // An extractor is a candidate for skip/prune if accuracy is low and contradictions are high,
  // or if its execution should be conditional based on previous stage's confidence.
  for (const v of featureVectors) {
    if (v.accuracy < 0.75 && v.contradictions > 0.05) {
      skipCandidates.push({
        extractor: v.extractor,
        reason: 'Low accuracy and high contradiction rate',
        rule: `${v.extractor} when semantic.confidence < 0.8`
      });
    } else if (v.extractor === 'RelationshipExtractor' && v.accuracy < 0.85) {
      // Specific rule to conditionalise the heavy RelationshipExtractor
      skipCandidates.push({
        extractor: v.extractor,
        reason: 'Optimal threshold gate based on semantic accuracy',
        rule: 'RelationshipExtractor when semantic.confidence > 0.85'
      });
    }
  }

  // 3. Parallelization opportunities
  // If we have independent extractors (e.g. SemanticExtractor and TopicExtractor),
  // they can run in parallel to reduce critical path latency.
  const serialStages = ['SemanticExtractor', 'TopicExtractor', 'ImageAnalyzerV2'];
  const presentStages = featureVectors.map(v => v.extractor);
  
  const parallelGroup = serialStages.filter(stage => presentStages.includes(stage));
  if (parallelGroup.length >= 2) {
    parallelCandidates.push(parallelGroup);
  }

  // 4. Simple drift clustering (DBSCAN analogy)
  // If multiple extractors are concurrently exhibiting high drift rate (>0.1), group them
  const drifted = featureVectors.filter(v => v.drift > 0.1).map(v => v.extractor);
  if (drifted.length > 0) {
    driftClusters.push({
      clusterId: `drift-cluster-${Date.now().toString().slice(-4)}`,
      extractors: drifted,
      avgSeverity: featureVectors.reduce((sum, v) => sum + v.drift, 0) / featureVectors.length
    });
  }

  return {
    bottlenecks,
    parallelCandidates,
    skipCandidates,
    driftClusters
  };
}

export default {
  analyzePatterns
};
