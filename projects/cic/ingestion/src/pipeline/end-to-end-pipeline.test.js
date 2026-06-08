/**
 * End-to-End Pipeline Test
 * Tests: ENRICH → ORCHESTRATE → SYNTHESIZE → AUDIT with ReverseImageSearchExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReverseImageSearchExtractor } from '../extractors/reverseImageSearch.js';
import { runExtractorsForAsset } from '../extractors/registry.js';
import { orchestrateArtifacts, groupArtifactsByDestination, consumeForTrustScoring } from './orchestrate-pipeline.js';
import { synthesizeNarrative, addDriftSignals } from './synthesize-pipeline.js';
import { auditPipeline, AUDIT_STATUS, SEVERITY } from './audit-pipeline.js';

describe('End-to-End Pipeline: ReverseImageSearchExtractor', () => {
  let testEnvelope;
  let mockCtx;

  beforeEach(() => {
    testEnvelope = {
      id: 'test-asset-1',
      region: 'us',
      source: { type: 'image', mime: 'image/jpeg' },
      content: {
        media: [{ type: 'image', data: Buffer.from('test-image-data') }],
        metadata: { filename: 'test.jpg', size: 1024 }
      },
      createdAt: new Date().toISOString(),
    };

    mockCtx = {
      logDebug: () => {},
      logWarn: () => {},
      logError: () => {}
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: ENRICH
  // ═══════════════════════════════════════════════════════════════════════════

  it('[ENRICH] ReverseImageSearchExtractor produces valid artifacts', async () => {
    const input = {
      envelope: testEnvelope,
      text: null,
      media: testEnvelope.content.media,
      metadata: testEnvelope.content.metadata
    };

    const result = await ReverseImageSearchExtractor.run(input, mockCtx);

    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.artifacts[0].payload.kind).toBe('reverse-image-results');
  });

  it('[ENRICH] Registry integration works correctly', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);

    expect(Array.isArray(extractionResults)).toBe(true);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    expect(enrichedArtifacts.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: ORCHESTRATE
  // ═══════════════════════════════════════════════════════════════════════════

  it('[ORCHESTRATE] Routes reverse-image-results to correct destinations', async () => {
    // Setup: Create sample artifacts
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    // Execute: Orchestrate routing
    const { routed, routing_stats } = await orchestrateArtifacts(enrichedArtifacts, 'test-correlation-id');

    expect(routed).toBeDefined();
    expect(routing_stats.routed_count).toBeGreaterThan(0);

    // Validate: reverse-image-results should route to multiple destinations
    const reverseImageRouted = routed.find((r) => r.kind === 'reverse-image-results');
    expect(reverseImageRouted).toBeDefined();
    expect(reverseImageRouted.destinations.length).toBeGreaterThanOrEqual(3); // trust-scorer, policy-validator, narrative-synthesizer
  });

  it('[ORCHESTRATE] Groups artifacts by destination', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed } = await orchestrateArtifacts(enrichedArtifacts, 'test-correlation-id');
    const grouped = groupArtifactsByDestination(routed);

    expect(Object.keys(grouped).length).toBeGreaterThan(0);
    expect(grouped['trust-scorer']).toBeDefined();
  });

  it('[ORCHESTRATE] Trust scorer consumes reverse-image signals', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed } = await orchestrateArtifacts(enrichedArtifacts, 'test-correlation-id');
    const grouped = groupArtifactsByDestination(routed);
    const trustScorerInput = grouped['trust-scorer'];

    const trustScores = await consumeForTrustScoring(trustScorerInput);

    expect(trustScores).toBeDefined();
    expect(trustScores.length).toBeGreaterThan(0);
    expect(trustScores[0].signal).toBe('reverse-image');
    expect(trustScores[0].confidence).toBeGreaterThanOrEqual(0);
    expect(trustScores[0].confidence).toBeLessThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: SYNTHESIZE
  // ═══════════════════════════════════════════════════════════════════════════

  it('[SYNTHESIZE] Generates narrative from artifact signals', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed } = await orchestrateArtifacts(enrichedArtifacts, 'test-correlation-id');
    const grouped = groupArtifactsByDestination(routed);

    // Simulate narrative signals from consumers
    const narrativeSignals = [];
    for (const artifact of grouped['narrative-synthesizer'] || []) {
      if (artifact.kind === 'reverse-image-results') {
        narrativeSignals.push({
          signal_type: 'reverse-image-evidence',
          confidence: artifact.artifact.payload.searchConfidence,
          top_result: artifact.artifact.payload.results[0],
        });
      }
    }

    const narrative = await synthesizeNarrative(narrativeSignals, testEnvelope, enrichedArtifacts, 'test-id');

    expect(narrative).toBeDefined();
    expect(narrative.claims).toBeDefined();
    expect(narrative.evidence).toBeDefined();
    expect(narrative.overall_confidence).toBeGreaterThanOrEqual(0);
    expect(narrative.overall_confidence).toBeLessThanOrEqual(1);
  });

  it('[SYNTHESIZE] Adds drift signals', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed } = await orchestrateArtifacts(enrichedArtifacts, 'test-correlation-id');
    const grouped = groupArtifactsByDestination(routed);

    const narrativeSignals = [];
    for (const artifact of grouped['narrative-synthesizer'] || []) {
      if (artifact.kind === 'reverse-image-results') {
        narrativeSignals.push({
          signal_type: 'reverse-image-evidence',
          confidence: artifact.artifact.payload.searchConfidence,
        });
      }
    }

    const narrative = await synthesizeNarrative(narrativeSignals, testEnvelope, enrichedArtifacts, 'test-id');
    const narrativeWithDrift = addDriftSignals(narrative, null);

    expect(narrativeWithDrift.drift_vector).toBeDefined();
    expect(narrativeWithDrift.drift_vector.overall_drift).toBeGreaterThanOrEqual(0);
    expect(narrativeWithDrift.drift_vector.overall_drift).toBeLessThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 4: AUDIT
  // ═══════════════════════════════════════════════════════════════════════════

  it('[AUDIT] Validates complete pipeline state', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed, routing_stats } = await orchestrateArtifacts(enrichedArtifacts, 'test-id');
    const grouped = groupArtifactsByDestination(routed);

    const narrativeSignals = [];
    for (const artifact of grouped['narrative-synthesizer'] || []) {
      if (artifact.kind === 'reverse-image-results') {
        narrativeSignals.push({
          signal_type: 'reverse-image-evidence',
          confidence: artifact.artifact.payload.searchConfidence,
        });
      }
    }

    const narrative = await synthesizeNarrative(narrativeSignals, testEnvelope, enrichedArtifacts, 'test-id');

    // Execute: Audit the complete pipeline
    const pipelineState = {
      envelope: testEnvelope,
      artifacts: enrichedArtifacts,
      routing: { routing_stats },
      narrative,
    };

    const auditReport = await auditPipeline(pipelineState, 'test-id');

    expect(auditReport).toBeDefined();
    expect(auditReport.status).toBeDefined();
    expect([AUDIT_STATUS.GREEN, AUDIT_STATUS.YELLOW, AUDIT_STATUS.RED]).toContain(auditReport.status);
    expect(auditReport.provenance).toBeDefined();
    expect(auditReport.issue_count).toBeGreaterThanOrEqual(0);
  });

  it('[AUDIT] Tracks reverse-image-results provenance', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const { routed, routing_stats } = await orchestrateArtifacts(enrichedArtifacts, 'test-id');
    const grouped = groupArtifactsByDestination(routed);

    const narrativeSignals = [];
    for (const artifact of grouped['narrative-synthesizer'] || []) {
      if (artifact.kind === 'reverse-image-results') {
        narrativeSignals.push({
          signal_type: 'reverse-image-evidence',
          confidence: artifact.artifact.payload.searchConfidence,
        });
      }
    }

    const narrative = await synthesizeNarrative(narrativeSignals, testEnvelope, enrichedArtifacts, 'test-id');

    const pipelineState = {
      envelope: testEnvelope,
      artifacts: enrichedArtifacts,
      routing: { routing_stats },
      narrative,
    };

    const auditReport = await auditPipeline(pipelineState, 'test-id');

    expect(auditReport.provenance).toBeDefined();
    expect(auditReport.provenance.asset_id).toBe(testEnvelope.id);
    expect(auditReport.provenance.extractors_used).toContain('reverse-image-search');
  });

  it('[AUDIT] Validates reverse-image artifact structure', async () => {
    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    const auditReport = await auditPipeline(
      { envelope: testEnvelope, artifacts: enrichedArtifacts, routing: {}, narrative: {} },
      'test-id'
    );

    expect(auditReport.status).toBe(AUDIT_STATUS.GREEN);
    const relevantIssues = auditReport.issues.filter(i => i.artifact_family === 'reverse-image-search');
    expect(relevantIssues.filter(i => i.severity === SEVERITY.ERROR).length).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration Summary
  // ═══════════════════════════════════════════════════════════════════════════

  it('[INTEGRATION] Complete pipeline flows end-to-end', async () => {
    // This is the happy path: envelope → ENRICH → ORCHESTRATE → SYNTHESIZE → AUDIT

    const extractionResults = await runExtractorsForAsset(testEnvelope, mockCtx);
    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    expect(enrichedArtifacts.length).toBeGreaterThan(0);

    const { routed } = await orchestrateArtifacts(enrichedArtifacts, 'test-id');
    expect(routed.length).toBeGreaterThan(0);

    const grouped = groupArtifactsByDestination(routed);
    const narrativeSignals = [];
    for (const artifact of grouped['narrative-synthesizer'] || []) {
      if (artifact.kind === 'reverse-image-results') {
        narrativeSignals.push({
          signal_type: 'reverse-image-evidence',
          confidence: artifact.artifact.payload.searchConfidence,
        });
      }
    }

    const narrative = await synthesizeNarrative(narrativeSignals, testEnvelope, enrichedArtifacts, 'test-id');
    expect(narrative).toBeDefined();

    const pipelineState = {
      envelope: testEnvelope,
      artifacts: enrichedArtifacts,
      routing: { routed },
      narrative,
    };

    const auditReport = await auditPipeline(pipelineState, 'test-id');
    expect(auditReport.status).toBe(AUDIT_STATUS.GREEN);

    console.log('✓ Complete pipeline flow verified end-to-end');
  });
});
