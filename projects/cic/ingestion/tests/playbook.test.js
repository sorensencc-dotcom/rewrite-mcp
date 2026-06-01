// File: projects/cic/ingestion/tests/playbook.test.js | Date: 2026-05-31 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getRollingWindow,
  addTelemetryEvent,
  resetTelemetryWindow,
  generateFeatureVectors,
  analyzePatterns,
  generateCandidates,
  simulateCandidate,
  evaluateAndPromote,
  promotePlaybook,
  rollbackPlaybook,
  loadCurrentPlaybook,
  getPlaybookHistory,
  isGovernanceLocked,
  freezeEvolution,
  unfreezeEvolution,
  evolvePlaybookCycle
} from '../src/playbook/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYBOOKS_DIR = path.resolve(__dirname, '../playbooks');
const CURRENT_PLAYBOOK_FILE = path.join(PLAYBOOKS_DIR, 'playbook.current.json');
const HISTORY_FILE = path.join(PLAYBOOKS_DIR, 'playbook.history.jsonl');

describe('Playbook Evolution Engine — Contract & Hybrid Tests', () => {
  
  beforeEach(async () => {
    // Reset/clear telemetry cache and playbooks prior to each test to isolate runs
    await resetTelemetryWindow();
    unfreezeEvolution();
    
    // Back up current files if any
    try {
      await fs.rm(CURRENT_PLAYBOOK_FILE, { force: true });
      await fs.rm(HISTORY_FILE, { force: true });
    } catch (err) {}
  });

  afterEach(async () => {
    await resetTelemetryWindow();
    unfreezeEvolution();
  });

  // --- TelemetryIngestor Tests ---
  describe('TelemetryIngestor', () => {
    it('should correctly save, load, and clear telemetry events', async () => {
      const initialWindow = await getRollingWindow();
      expect(initialWindow).toEqual([]);

      const sampleEvent = {
        extractor: 'SemanticExtractor',
        accuracy: 0.95,
        latency_ms: 180,
        drift_detected: false,
        contradictionRate: 0.01
      };

      const success = await addTelemetryEvent(sampleEvent);
      expect(success).toBe(true);

      const updatedWindow = await getRollingWindow();
      expect(updatedWindow.length).toBe(1);
      expect(updatedWindow[0].extractor).toBe('SemanticExtractor');
      expect(updatedWindow[0].accuracy).toBe(0.95);

      await resetTelemetryWindow();
      const clearedWindow = await getRollingWindow();
      expect(clearedWindow).toEqual([]);
    });

    it('should normalize multiple rolling events into structured feature vectors', async () => {
      const mockEvents = [
        { extractor: 'SemanticExtractor', accuracy: 0.95, latency_ms: 150 },
        { extractor: 'SemanticExtractor', accuracy: 0.93, latency_ms: 170 },
        { extractor: 'RelationshipExtractor', accuracy: 0.80, latency_ms: 450, drift_detected: true }
      ];

      for (const e of mockEvents) {
        await addTelemetryEvent(e);
      }

      const window = await getRollingWindow();
      const vectors = generateFeatureVectors(window);

      expect(vectors.length).toBe(2);
      
      const semantic = vectors.find(v => v.extractor === 'SemanticExtractor');
      const relation = vectors.find(v => v.extractor === 'RelationshipExtractor');

      expect(semantic).toBeDefined();
      expect(semantic.accuracy).toBe(0.94); // Average of 0.95 and 0.93
      expect(semantic.drift).toBe(0);

      expect(relation).toBeDefined();
      expect(relation.accuracy).toBe(0.80);
      expect(relation.drift).toBe(1.0);
      expect(relation.latencyP95).toBe(450);
    });
  });

  // --- PatternAnalyzer Tests ---
  describe('PatternAnalyzer', () => {
    it('should detect bottleneck extractors and suggest parallel/conditional stages', () => {
      const featureVectors = [
        { extractor: 'SemanticExtractor', accuracy: 0.95, latencyP95: 120, drift: 0.0, contradictions: 0.0 },
        { extractor: 'RelationshipExtractor', accuracy: 0.70, latencyP95: 480, drift: 0.1, contradictions: 0.09 },
        { extractor: 'TopicExtractor', accuracy: 0.92, latencyP95: 80, drift: 0.0, contradictions: 0.01 }
      ];

      const analysis = analyzePatterns(featureVectors);

      // RelationshipExtractor is a bottleneck (latency > 400ms)
      expect(analysis.bottlenecks).toContain('RelationshipExtractor');
      
      // SemanticExtractor and TopicExtractor can run in parallel
      expect(analysis.parallelCandidates.length).toBeGreaterThan(0);
      expect(analysis.parallelCandidates[0]).toContain('SemanticExtractor');
      expect(analysis.parallelCandidates[0]).toContain('TopicExtractor');

      // RelationshipExtractor has low accuracy and high contradictions, should be conditionalized
      expect(analysis.skipCandidates.some(c => c.extractor === 'RelationshipExtractor')).toBe(true);
    });
  });

  // --- EvolutionPlanner Tests ---
  describe('EvolutionPlanner', () => {
    it('should generate mutated candidates based on patterns', () => {
      const currentPlaybook = {
        version: 'pb-test-01',
        stages: [
          { name: 'SemanticExtractor', mode: 'serial', weight: 0.9 },
          { name: 'RelationshipExtractor', mode: 'serial', weight: 0.7 },
          { name: 'TopicExtractor', mode: 'serial', weight: 0.8 }
        ],
        rules: { skipIf: [], forceRun: [] }
      };

      const patterns = {
        bottlenecks: ['RelationshipExtractor'],
        parallelCandidates: [['SemanticExtractor', 'TopicExtractor']],
        skipCandidates: [{ extractor: 'RelationshipExtractor', rule: 'RelationshipExtractor when semantic.confidence > 0.85' }]
      };

      const candidates = generateCandidates(currentPlaybook, patterns);

      // Verify candidates include parallelized and conditionalized mutations
      expect(candidates.length).toBeGreaterThan(0);
      
      const parallelCand = candidates.find(c => c.mutation.includes('parallelize'));
      expect(parallelCand).toBeDefined();
      expect(parallelCand.playbook.stages.find(s => s.name === 'SemanticExtractor').mode).toBe('parallel');

      const conditionalCand = candidates.find(c => c.mutation.includes('conditionalize'));
      expect(conditionalCand).toBeDefined();
      expect(conditionalCand.playbook.stages.find(s => s.name === 'RelationshipExtractor').mode).toBe('conditional');
    });
  });

  // --- SimulationRunner Tests ---
  describe('SimulationRunner', () => {
    it('should run N statistical trials and verify SLO compliance', async () => {
      const candidate = {
        id: 'pb-cand-01',
        mutation: 'parallelize-topic-semantic',
        playbook: {
          version: 'pb-mutated-01',
          stages: [
            { name: 'SemanticExtractor', mode: 'parallel' },
            { name: 'TopicExtractor', mode: 'parallel' }
          ]
        }
      };

      const currentPlaybook = {
        version: 'pb-current-01',
        stages: [
          { name: 'SemanticExtractor', mode: 'serial' },
          { name: 'TopicExtractor', mode: 'serial' }
        ]
      };

      const results = await simulateCandidate(candidate, [], currentPlaybook, 200);

      expect(results.candidate).toBe('pb-cand-01');
      expect(typeof results.accuracyDelta).toBe('number');
      expect(typeof results.latencyDelta).toBe('number');
      // Parallelizing should reduce average critical path latency, yielding a negative delta
      expect(results.latencyDelta).toBeLessThan(0.0);
      expect(results.sloPass).toBe(true);
    });
  });

  // --- PlaybookPublisher Tests ---
  describe('PlaybookPublisher & Governance Controls', () => {
    it('should promote the winning candidate and maintain audit trail logs', async () => {
      const winningPb = {
        version: 'pb-winner-01',
        stages: [
          { name: 'SemanticExtractor', mode: 'parallel' },
          { name: 'TopicExtractor', mode: 'parallel' }
        ],
        rules: { skipIf: [], forceRun: [] }
      };

      const res = await promotePlaybook(winningPb, 0.05, 'parallelize-topic-semantic');
      expect(res.success).toBe(true);

      const promoted = await loadCurrentPlaybook();
      expect(promoted.stages.find(s => s.name === 'SemanticExtractor').mode).toBe('parallel');

      const history = await getPlaybookHistory();
      expect(history.length).toBe(1);
      expect(history[0].event).toBe('playbook.updated');
      expect(history[0].mutation).toBe('parallelize-topic-semantic');
    });

    it('should immediately rollback to last operational config in < 100ms', async () => {
      const seedPb = {
        version: 'pb-seed-01',
        stages: [{ name: 'SemanticExtractor', mode: 'serial' }]
      };
      await promotePlaybook(seedPb, 0.0, 'seed');

      const mutatedPb = {
        version: 'pb-mutated-01',
        stages: [{ name: 'SemanticExtractor', mode: 'parallel' }]
      };
      await promotePlaybook(mutatedPb, 0.05, 'mutate');

      // Check rollback capability
      const t0 = performance.now();
      const rollbackRes = await rollbackPlaybook();
      const elapsed = performance.now() - t0;

      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.version).toBe('pb-seed-01');
      // Fast target: rollback executes in < 100ms
      expect(elapsed).toBeLessThan(100);

      const active = await loadCurrentPlaybook();
      expect(active.version).toBe('pb-seed-01');
      expect(active.stages[0].mode).toBe('serial');

      const history = await getPlaybookHistory();
      const rollbackLog = history.find(h => h.event === 'playbook.rollback');
      expect(rollbackLog).toBeDefined();
    });

    it('should enforce governance locks and veto promotions when active', async () => {
      freezeEvolution();
      expect(isGovernanceLocked()).toBe(true);

      const current = await loadCurrentPlaybook();
      const candidateSims = [{ candidate: 'cand-01', accuracyDelta: 0.05, latencyDelta: -0.1, sloPass: true }];
      const candidates = [{ id: 'cand-01', playbook: { version: 'pb-cand', stages: [] } }];

      const res = await evaluateAndPromote(current, candidateSims, candidates);
      expect(res.promoted).toBe(false);
      expect(res.reason).toContain('Governance veto');

      unfreezeEvolution();
      expect(isGovernanceLocked()).toBe(false);
    });
  });

  // --- End-to-End Orchestrator Loop Tests ---
  describe('End-to-End evolution cycle', () => {
    it('should gracefully handle sparse data (events < minEvents)', async () => {
      const result = await evolvePlaybookCycle({ minEvents: 5 });
      expect(result.evolved).toBe(false);
      expect(result.reason).toContain('Insufficient telemetry samples');
    });

    it('should run full evolution cycle end-to-end when telemetry is available', async () => {
      // Seed historical telemetry
      const mockEvents = [
        { extractor: 'SemanticExtractor', accuracy: 0.95, latency_ms: 120 },
        { extractor: 'SemanticExtractor', accuracy: 0.93, latency_ms: 130 },
        { extractor: 'RelationshipExtractor', accuracy: 0.72, latency_ms: 480, drift_detected: true },
        { extractor: 'RelationshipExtractor', accuracy: 0.70, latency_ms: 500, drift_detected: true },
        { extractor: 'TopicExtractor', accuracy: 0.90, latency_ms: 90 },
        { extractor: 'TopicExtractor', accuracy: 0.88, latency_ms: 100 }
      ];

      for (const e of mockEvents) {
        await addTelemetryEvent(e);
      }

      // Evolve
      const result = await evolvePlaybookCycle({ minEvents: 5, N: 100 });
      
      expect(result.candidatesCount).toBeGreaterThan(0);
      expect(result.simulations.length).toBeGreaterThan(0);
      
      // Should propose either parallelizing topic-semantic or conditionalizing RelationshipExtractor
      expect(result.evolved).toBe(true);
      expect(result.promotionResult.success).toBe(true);
      
      const current = await loadCurrentPlaybook();
      expect(current.version).toBe(result.promotionResult.version);
    });
  });

});
