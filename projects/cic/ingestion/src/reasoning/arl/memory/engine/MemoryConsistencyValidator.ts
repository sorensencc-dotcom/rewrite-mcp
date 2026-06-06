import {
  MemorySnapshot,
  ExpansionContext,
  ExpansionClaim,
  IMemoryStore,
} from '../contracts/MemorySnapshot';
import {
  MemoryConsistencyResult,
  MemoryViolation,
  MemoryValidationReport,
} from '../contracts/MemoryConsistencyResult';
import { EntityTimeline } from '../contracts/EntityTimeline';

/**
 * Phase 7.15 — Memory Consistency Engine
 * Validates that expansions don't violate historical memory coherence
 */
export class MemoryConsistencyValidator {
  private memoryStore: IMemoryStore | null = null;
  private previousResults: Map<string, MemoryConsistencyResult> = new Map();

  constructor(memoryStore?: IMemoryStore) {
    this.memoryStore = memoryStore || null;
  }

  /**
   * Validate expansion against memory
   */
  async validate(
    expansion: ExpansionContext,
    memory: MemorySnapshot
  ): Promise<MemoryValidationReport> {
    const violations: MemoryViolation[] = [];
    const missingContext: string[] = [];
    let temporalCoherence = 1.0;
    let narrativeCoherence = 1.0;

    // Phase 1: Check all entities exist
    const entityMap = new Map(memory.entities.map((e) => [e.entityId, e]));
    for (const claim of expansion.claims) {
      if (!entityMap.has(claim.entityId)) {
        violations.push({
          entityId: claim.entityId,
          type: 'MISSING_ENTITY',
          severity: 'high',
          details: `Expansion references unknown entity: ${claim.entityId}`,
          claimIndex: expansion.claims.indexOf(claim),
          suggestedResolution: 'Add entity to memory or use existing entity ID',
        });
      }
    }

    // Phase 2: Temporal consistency checks (per entity)
    for (const claim of expansion.claims) {
      const entity = entityMap.get(claim.entityId);
      if (!entity) continue;

      const temporalViolations = this.checkTemporalConsistency(
        claim,
        entity,
        expansion
      );
      violations.push(...temporalViolations);

      if (temporalViolations.length > 0) {
        temporalCoherence -= temporalViolations.length * 0.15;
      }
    }

    // Phase 3: Contradiction checks (claims vs historical)
    for (const claim of expansion.claims) {
      const entity = entityMap.get(claim.entityId);
      if (!entity) continue;

      const contradictions = this.checkContradictions(
        claim,
        entity,
        expansion
      );
      violations.push(...contradictions);

      if (contradictions.length > 0) {
        narrativeCoherence -= contradictions.length * 0.2;
      }
    }

    // Phase 4: Context sufficiency checks
    for (const claim of expansion.claims) {
      const contextIssues = this.checkMissingContext(claim);
      missingContext.push(...contextIssues);
    }

    // Compute alignment score
    const baseScore = 1.0;
    const violationPenalty = Math.min(violations.length * 0.1, 0.7);
    const alignmentScore = Math.max(
      0.2,
      baseScore - violationPenalty
    ) * Math.max(0.5, temporalCoherence) * Math.max(0.5, narrativeCoherence);

    // Compute drift vector (vs previous validation of same expansion if exists)
    const previous = this.previousResults.get(expansion.expansionId);
    const driftVector = previous
      ? alignmentScore - previous.alignmentScore
      : 0;

    // Determine approval recommendation
    let approvalRecommendation: 'auto_approve' | 'review' | 'reject' =
      'auto_approve';
    if (violations.some((v) => v.severity === 'critical')) {
      approvalRecommendation = 'reject';
    } else if (
      violations.length > 0 ||
      missingContext.length > 2 ||
      alignmentScore < 0.7
    ) {
      approvalRecommendation = 'review';
    }

    const result: MemoryConsistencyResult = {
      expansionId: expansion.expansionId,
      alignmentScore: Math.max(0, Math.min(1, alignmentScore)),
      driftVector,
      violations,
      missingContext,
      temporalCoherence: Math.max(0, Math.min(1, temporalCoherence)),
      narrativeCoherence: Math.max(0, Math.min(1, narrativeCoherence)),
      approvalRecommendation,
      timestamp: new Date().toISOString(),
    };

    // Store result for future drift calculation
    this.previousResults.set(expansion.expansionId, result);

    // Generate detailed analysis
    const detailedAnalysis = {
      temporalFindings: violations
        .filter((v) => v.type.startsWith('TEMPORAL'))
        .map((v) => v.details),
      contradictionFindings: violations
        .filter((v) => v.type === 'CONTRADICTION')
        .map((v) => v.details),
      contextFindings: missingContext,
    };

    return {
      result,
      detailedAnalysis,
    };
  }

  /**
   * Check temporal consistency: events must be properly ordered
   */
  private checkTemporalConsistency(
    claim: ExpansionClaim,
    entity: EntityTimeline,
    expansion: ExpansionContext
  ): MemoryViolation[] {
    const violations: MemoryViolation[] = [];

    // If claim is an event, check against existing timeline
    if (claim.claimType === 'event') {
      const claimTime = new Date(claim.timestamp);
      const entityFirstMention = new Date(entity.firstMentioned);

      // Check 1: Event can't precede entity first mention
      if (claimTime < entityFirstMention) {
        violations.push({
          entityId: claim.entityId,
          type: 'TEMPORAL_IMPOSSIBILITY',
          severity: 'high',
          details: `Event "${claim.statement}" dated ${claim.timestamp} but entity first mentioned at ${entity.firstMentioned}`,
          suggestedResolution: 'Adjust event timestamp or update entity first-mention date',
        });
      }

      // Check 2: Event ordering against previous events
      const priorEvents = entity.events.filter(
        (e) => new Date(e.timestamp) <= claimTime
      );
      const laterEvents = entity.events.filter(
        (e) => new Date(e.timestamp) > claimTime
      );

      // Simple causality check: if event E1 says "moved to X" and later event E2 says "was at Y", check temporal coherence
      if (priorEvents.length > 0 && laterEvents.length > 0) {
        const lastPrior = priorEvents[priorEvents.length - 1];
        const description = claim.statement.toLowerCase();

        // Check for obvious contradictions in sequencing
        if (
          lastPrior.description.includes('died') &&
          !description.includes('posthumous')
        ) {
          violations.push({
            entityId: claim.entityId,
            type: 'TEMPORAL_ORDER',
            severity: 'critical',
            details: `Event "${claim.statement}" occurs after entity death (${lastPrior.description})`,
            suggestedResolution: 'Remove event or clarify as posthumous',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for contradictions between new claims and existing attributes/events
   */
  private checkContradictions(
    claim: ExpansionClaim,
    entity: EntityTimeline,
    expansion: ExpansionContext
  ): MemoryViolation[] {
    const violations: MemoryViolation[] = [];

    if (claim.claimType === 'attribute') {
      const [attrKey, attrValue] = claim.statement.split(':').map((s) => s.trim());

      // Check against existing attributes
      if (entity.attributes[attrKey]) {
        const existingValue = entity.attributes[attrKey];

        // Direct contradiction
        if (
          existingValue.toLowerCase() !== attrValue.toLowerCase() &&
          this.isContradictory(existingValue, attrValue)
        ) {
          violations.push({
            entityId: claim.entityId,
            type: 'ATTRIBUTE_CONFLICT',
            severity: 'high',
            details: `Attribute conflict: ${attrKey} is "${existingValue}" but claim says "${attrValue}"`,
            suggestedResolution:
              'Verify which value is correct; may require separate validation',
          });
        }
      }
    }

    if (claim.claimType === 'relationship') {
      const [relType, relatedId] = claim.statement.split('→').map((s) => s.trim());

      // Check if contradictory relationship exists
      const existingRel = entity.relationships.find(
        (r) => r.relatedEntityId === relatedId
      );
      if (existingRel && this.isContradictory(existingRel.relationshipType, relType)) {
        violations.push({
          entityId: claim.entityId,
          type: 'RELATIONSHIP_CONFLICT',
          severity: 'medium',
          details: `Relationship conflict: ${claim.entityId} is "${existingRel.relationshipType}" with ${relatedId} but claim says "${relType}"`,
          suggestedResolution: 'Reconcile relationship types or update existing relationship',
        });
      }
    }

    return violations;
  }

  /**
   * Check if sufficient context exists to validate claim
   */
  private checkMissingContext(claim: ExpansionClaim): string[] {
    const missing: string[] = [];

    // Spatial context
    if (
      claim.statement.toLowerCase().includes('location') &&
      !claim.statement.includes('at ')
    ) {
      missing.push(`Location claim missing specific place: "${claim.statement}"`);
    }

    // Temporal context (claims about events should have time references)
    if (
      claim.claimType === 'event' &&
      claim.timestamp === claim.timestamp && // placeholder; real: check if timestamp is vague
      claim.statement.length < 20
    ) {
      missing.push(
        `Event claim too brief, may lack context: "${claim.statement}"`
      );
    }

    // Causal context
    if (
      claim.statement.includes('because') &&
      claim.statement.split('because').length === 2 &&
      claim.statement.split('because')[1].trim().length < 5
    ) {
      missing.push(`Causal claim missing reason: "${claim.statement}"`);
    }

    return missing;
  }

  /**
   * Determine if two values are contradictory
   */
  private isContradictory(val1: string, val2: string): boolean {
    const v1 = val1.toLowerCase();
    const v2 = val2.toLowerCase();

    // Exact match = not contradictory
    if (v1 === v2) return false;

    // Known contradictory pairs
    const contradictions: Array<[string, string]> = [
      ['alive', 'dead'],
      ['single', 'married'],
      ['present', 'absent'],
      ['true', 'false'],
      ['yes', 'no'],
    ];

    for (const [a, b] of contradictions) {
      if ((v1.includes(a) && v2.includes(b)) || (v1.includes(b) && v2.includes(a))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get cumulative memory consistency across multiple validations
   */
  getConsistencyStats(): {
    validationsRun: number;
    avgAlignment: number;
    maxDrift: number;
    violationRate: number;
  } {
    if (this.previousResults.size === 0) {
      return {
        validationsRun: 0,
        avgAlignment: 1.0,
        maxDrift: 0,
        violationRate: 0,
      };
    }

    const results = Array.from(this.previousResults.values());
    const avgAlignment =
      results.reduce((sum, r) => sum + r.alignmentScore, 0) / results.length;
    const maxDrift = Math.max(
      ...results.map((r) => Math.abs(r.driftVector))
    );
    const totalViolations = results.reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    const violationRate = totalViolations / results.length;

    return {
      validationsRun: results.length,
      avgAlignment,
      maxDrift,
      violationRate,
    };
  }
}
