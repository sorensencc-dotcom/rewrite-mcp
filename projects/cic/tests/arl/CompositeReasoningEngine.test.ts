import { describe, it, expect } from 'vitest';
import { computeCompositeReasoning } from '../../src/reasoning/arl/engine/CompositeReasoningEngine';
import { CoherenceScore } from '../../src/reasoning/arl/contracts/CoherenceScore';
import { SemanticAlignment } from '../../src/reasoning/arl/contracts/SemanticAlignment';
import { TemporalConsistency } from '../../src/reasoning/arl/contracts/TemporalConsistency';
import { CausalReasoning } from '../../src/reasoning/arl/contracts/CausalReasoning';
import { NarrativeImpact } from '../../src/reasoning/arl/contracts/NarrativeImpact';

describe('CompositeReasoningEngine', () => {
  it('returns deterministic structure with mapped subsystem scores', () => {
    const coherence: CoherenceScore = { narrative: 0, semantic: 0, temporal: 0, overall: 0.1 };
    const semantic: SemanticAlignment = {
      recognizedEntities: [],
      unrecognizedEntities: [],
      relationshipMatches: 0,
      entityCoverage: 0,
      overall: 0.2
    };
    const temporal: TemporalConsistency = {
      orderingScore: 0,
      causalityScore: 0,
      conflictCount: 0,
      driftTemporalImpact: 0,
      overall: 0.3
    };
    const causal: CausalReasoning = {
      causalLinks: [],
      missingPrerequisites: [],
      violatedDependencies: [],
      causalStrength: 0,
      conflictCount: 0,
      overall: 0.4
    };
    const narrative: NarrativeImpact = {
      reinforcementScore: 0,
      dilutionScore: 0,
      contradictionScore: 0,
      noveltyScore: 0,
      riskScore: 0,
      overall: 0.5
    };

    const result = computeCompositeReasoning(
      coherence,
      semantic,
      temporal,
      causal,
      narrative
    );

    expect(result).toEqual({
      coherence: 0.1,
      semantic: 0.2,
      temporal: 0.3,
      causal: 0.4,
      narrative: 0.5,
      overall: 0
    });
  });
});
