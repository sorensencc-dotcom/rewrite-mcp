import { describe, it, expect } from 'vitest';
import { computeDriftImpact } from '../../src/reasoning/arl/engine/DriftImpactCalculator';
import { SemanticAlignment } from '../../src/reasoning/arl/contracts/SemanticAlignment';
import { TemporalConsistency } from '../../src/reasoning/arl/contracts/TemporalConsistency';
import { NarrativeImpact } from '../../src/reasoning/arl/contracts/NarrativeImpact';
import { CausalReasoning } from '../../src/reasoning/arl/contracts/CausalReasoning';
import { CompositeReasoning } from '../../src/reasoning/arl/contracts/CompositeReasoning';

describe('DriftImpactCalculator', () => {
  it('returns deterministic structure with zeroed drift components', () => {
    const semantic: SemanticAlignment = {
      recognizedEntities: [],
      unrecognizedEntities: [],
      relationshipMatches: 0,
      entityCoverage: 0,
      overall: 0.5
    };
    const temporal: TemporalConsistency = {
      orderingScore: 0,
      causalityScore: 0,
      conflictCount: 0,
      driftTemporalImpact: 0,
      overall: 0.5
    };
    const narrative: NarrativeImpact = {
      reinforcementScore: 0,
      dilutionScore: 0,
      contradictionScore: 0,
      noveltyScore: 0,
      riskScore: 0,
      overall: 0.5
    };
    const causal: CausalReasoning = {
      causalLinks: [],
      missingPrerequisites: [],
      violatedDependencies: [],
      causalStrength: 0,
      conflictCount: 0,
      overall: 0.5
    };
    const composite: CompositeReasoning = {
      coherence: 0.5,
      semantic: 0.5,
      temporal: 0.5,
      causal: 0.5,
      narrative: 0.5,
      overall: 0
    };

    const result = computeDriftImpact(semantic, temporal, narrative, causal, composite);

    expect(result).toEqual({
      semanticDrift: 0,
      temporalDrift: 0,
      narrativeDrift: 0,
      causalDrift: 0,
      compositeDrift: 0,
      overall: 0
    });
  });
});
