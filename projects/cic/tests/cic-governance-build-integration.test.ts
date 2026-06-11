/**
 * Phase 24.5 — Build Governance Integration Tests
 * Validates: BuildValidator, BuildApprovalGate, BuildGovernanceIntegration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PacketBuilder,
  BuildLineagePacket,
  PolicyContext,
  isBuildLineagePacket,
} from '../src/governance/packet-types.js';
import {
  BuildValidator,
  BuildValidationResult,
} from '../src/governance/build-validator.js';
import {
  BuildApprovalGate,
  PromotionVerdict,
} from '../src/governance/build-approval-gate.js';
import { BuildGovernanceIntegration } from '../src/governance/build-governance-integration.js';
import { GovernanceMemoryStore } from '../src/governance/governance-memory-store.js';
import { RunContext } from '../src/governance/run-context.js';
import { PolicyRail } from '../src/governance/types.js';

describe('Phase 24.5 — Build Governance Integration', () => {
  let store: GovernanceMemoryStore;
  let validator: BuildValidator;
  let gate: BuildApprovalGate;
  let integration: BuildGovernanceIntegration;
  let runContext: RunContext;

  beforeEach(() => {
    store = new GovernanceMemoryStore();
    validator = new BuildValidator();
    gate = new BuildApprovalGate();

    const policies: PolicyRail[] = [
      {
        rail_id: 'registry-allowlist',
        type: 'DOMAIN',
        rule_id: 'registry-allowlist',
        rule_value: ['registry.internal.cic/', 'ghcr.io/rewrite-labs/'],
      },
    ];

    integration = new BuildGovernanceIntegration({
      memory_store: store,
      active_policies: policies,
      promotion_target: 'production',
      require_council_vote: true,
    });

    runContext = new RunContext('test-run-001', 'cic.orchestration', 'orchestrate');
  });

  describe('BuildValidator', () => {
    it('validates provenance git_sha format', () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-001',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'cic.ingestion',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-001',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'cic.ingestion:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
              digest_sha256: 'a' + '0'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-001',
            format: 'cyclonedx',
            ref_uri: 'sbom/cic-ingestion-0.7.0.xml',
            component_count: 15,
          },
          provenance: {
            git_sha: 'abc123def456' + '0'.repeat(28),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-node',
            builder_version: '1.0.0',
            determinism_hash: 'sha256:' + 'b'.repeat(64),
          },
        },
      };

      const result = validator.validate(packet);
      expect(result.overall_status).toBe('passed');
      expect(result.failed_checks).toHaveLength(0);
    });

    it('rejects invalid git_sha format', () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-002',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'cic.ingestion',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-002',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'cic.ingestion:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
              digest_sha256: 'a' + '0'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-002',
            format: 'cyclonedx',
            ref_uri: 'sbom/cic-ingestion-0.7.0.xml',
            component_count: 15,
          },
          provenance: {
            git_sha: 'invalid-sha-too-short',
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-node',
            determinism_hash: 'sha256:' + 'b'.repeat(64),
          },
        },
      };

      const result = validator.validate(packet);
      expect(result.overall_status).toBe('failed');
      expect(result.failed_checks.length).toBeGreaterThan(0);
      expect(result.failed_checks.some((c) => c.check_id === 'provenance-git-sha-format')).toBe(
        true
      );
    });

    it('validates SBOM completeness', () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-003',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'cic.ingestion',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-003',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'cic.ingestion:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
              digest_sha256: 'c' + '1'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-003',
            format: 'spdx',
            ref_uri: 'sbom/cic-ingestion-0.7.0.json',
            component_count: 2,
          },
          provenance: {
            git_sha: 'd' + '2'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-python',
            determinism_hash: 'sha256:' + 'c'.repeat(64),
          },
        },
      };

      const result = validator.validate(packet);
      expect(result.warnings.some((c) => c.check_id === 'sbom-component-count')).toBe(true);
    });
  });

  describe('BuildApprovalGate', () => {
    it('evaluates gate decision correctly', () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-004',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'labs.redesign.gpu',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-004',
          agent_id: 'labs.redesign.gpu',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'labs.redesign.gpu:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/labs/redesign:0.7.0',
              digest_sha256: 'e' + '3'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-004',
            format: 'cyclonedx',
            ref_uri: 'sbom/labs-redesign-0.7.0.xml',
            component_count: 25,
          },
          provenance: {
            git_sha: 'f' + '4'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-python-cuda',
            determinism_hash: 'sha256:' + 'd'.repeat(64),
          },
        },
      };

      const validation = validator.validate(packet);
      const decision = gate.evaluateGate(packet, validation, 'run-001');

      expect(decision.validation_passed).toBe(true);
      expect(decision.requires_council).toBe(true);
    });

    it('computes promotion verdict from council votes', () => {
      const votes = [
        {
          council_member_id: 'safety_council',
          member_id: 'safety_council',
          vote: 'permit' as const,
          rationale: 'All safety checks passed',
          confidence: 0.95,
        },
        {
          council_member_id: 'performance_council',
          member_id: 'performance_council',
          vote: 'permit' as const,
          rationale: 'Performance acceptable',
          confidence: 0.9,
        },
        {
          council_member_id: 'security_council',
          member_id: 'security_council',
          vote: 'permit' as const,
          rationale: 'Supply chain valid',
          confidence: 0.92,
        },
      ];

      const verdict = gate.computeVerdict('build-001', 'production', votes);

      expect(verdict.verdict).toBe('permit');
      expect(verdict.permit_votes).toBe(3);
      expect(verdict.block_votes).toBe(0);
      expect(verdict.majority_permit).toBe(true);
    });

    it('enforces unanimous block veto rule', () => {
      const votes = [
        {
          council_member_id: 'safety_council',
          member_id: 'safety_council',
          vote: 'block' as const,
          rationale: 'Hard safety violation',
          confidence: 1.0,
        },
        {
          council_member_id: 'performance_council',
          member_id: 'performance_council',
          vote: 'permit' as const,
          rationale: 'Performance acceptable',
          confidence: 0.9,
        },
      ];

      const verdict = gate.computeVerdict('build-001', 'production', votes);

      expect(verdict.verdict).toBe('block');
      expect(verdict.block_votes).toBe(1);
      expect(verdict.permit_votes).toBe(1);
    });

    it('returns revise when no majority permit and no block', () => {
      const votes = [
        {
          council_member_id: 'safety_council',
          member_id: 'safety_council',
          vote: 'permit' as const,
          rationale: 'Safe',
          confidence: 0.8,
        },
        {
          council_member_id: 'performance_council',
          member_id: 'performance_council',
          vote: 'revise' as const,
          rationale: 'Needs investigation',
          confidence: 0.7,
        },
        {
          council_member_id: 'security_council',
          member_id: 'security_council',
          vote: 'revise' as const,
          rationale: 'Requires audit',
          confidence: 0.75,
        },
      ];

      const verdict = gate.computeVerdict('build-001', 'production', votes);

      expect(verdict.verdict).toBe('revise');
      expect(verdict.permit_votes).toBe(1);
      expect(verdict.revise_votes).toBe(2);
    });
  });

  describe('BuildGovernanceIntegration', () => {
    it('ingest lineage packet and produce governance evidence', async () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-005',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'cic.ingestion',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-005',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'cic.ingestion:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
              digest_sha256: 'g' + '5'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-005',
            format: 'cyclonedx',
            ref_uri: 'sbom/cic-ingestion-0.7.0.xml',
            component_count: 18,
          },
          provenance: {
            git_sha: 'h' + '6'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-python',
            determinism_hash: 'sha256:' + 'e'.repeat(64),
          },
        },
      };

      const result = await integration.ingestLineagePacket(packet, runContext, {
        promoted_to: 'production',
      });

      expect(result.lineage_packet.packet_id).toBe('pkt-005');
      expect(result.validation_result.overall_status).toBe('passed');
      expect(result.gate_packet).toBeDefined();
      expect(result.council_packet).toBeDefined();
      expect(result.promotion_verdict).toBeDefined();
      expect(result.all_packets).toHaveLength(3);
    });

    it('batch ingest multiple lineage packets', async () => {
      const packets: BuildLineagePacket[] = [
        {
          packet_id: 'pkt-006',
          packet_type: 'build_lineage',
          run_id: 'run-002',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          timestamp: new Date().toISOString(),
          content: {
            build_id: 'build-20260609-006',
            agent_id: 'cic.ingestion',
            phase: 'execution',
            artifacts: [
              {
                artifact_id: 'cic.ingestion:0.7.0',
                artifact_type: 'container',
                registry_uri: 'registry.internal.cic/cic/ingestion:0.7.0',
                digest_sha256: 'i' + '7'.repeat(63),
              },
            ],
            sbom: {
              sbom_id: 'sbom-006',
              format: 'cyclonedx',
              ref_uri: 'sbom/cic-ingestion-0.7.0.xml',
              component_count: 20,
            },
            provenance: {
              git_sha: 'j' + '8'.repeat(39),
              timestamp: new Date().toISOString(),
              builder: 'thefoundry-python',
              determinism_hash: 'sha256:' + 'f'.repeat(64),
            },
          },
        },
        {
          packet_id: 'pkt-007',
          packet_type: 'build_lineage',
          run_id: 'run-002',
          agent_id: 'labs.discovery',
          phase: 'execution',
          timestamp: new Date().toISOString(),
          content: {
            build_id: 'build-20260609-007',
            agent_id: 'labs.discovery',
            phase: 'execution',
            artifacts: [
              {
                artifact_id: 'labs.discovery:0.7.0',
                artifact_type: 'container',
                registry_uri: 'registry.internal.cic/labs/discovery:0.7.0',
                digest_sha256: 'k' + '9'.repeat(63),
              },
            ],
            sbom: {
              sbom_id: 'sbom-007',
              format: 'cyclonedx',
              ref_uri: 'sbom/labs-discovery-0.7.0.xml',
              component_count: 22,
            },
            provenance: {
              git_sha: 'l' + 'a'.repeat(39),
              timestamp: new Date().toISOString(),
              builder: 'thefoundry-node',
              determinism_hash: 'sha256:' + '0'.repeat(64),
            },
          },
        },
      ];

      const result = await integration.ingestLineagePackets(packets, runContext, {
        promoted_to: 'production',
      });

      expect(result.total_packets).toBe(2);
      expect(result.total_passed).toBe(2);
      expect(result.total_failed).toBe(0);
      expect(result.all_packets.length).toBeGreaterThan(2);
    });

    it('query build evidence from vault', async () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-008',
        packet_type: 'build_lineage',
        run_id: 'run-003',
        agent_id: 'cic.evolution',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-008',
          agent_id: 'cic.evolution',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'cic.evolution:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/cic/evolution:0.7.0',
              digest_sha256: 'm' + 'b'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-008',
            format: 'cyclonedx',
            ref_uri: 'sbom/cic-evolution-0.7.0.xml',
            component_count: 16,
          },
          provenance: {
            git_sha: 'n' + 'c'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-python',
            determinism_hash: 'sha256:' + '1'.repeat(64),
          },
        },
      };

      await integration.ingestLineagePacket(packet, runContext);

      const evidence = integration.queryBuildEvidence('build-20260609-008');
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence.some((p) => p.packet_type === 'build_lineage')).toBe(true);
    });

    it('check production promotion eligibility', async () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-009',
        packet_type: 'build_lineage',
        run_id: 'run-004',
        agent_id: 'labs.extractor',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-009',
          agent_id: 'labs.extractor',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'labs.extractor:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/labs/extractor:0.7.0',
              digest_sha256: 'o' + 'd'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-009',
            format: 'cyclonedx',
            ref_uri: 'sbom/labs-extractor-0.7.0.xml',
            component_count: 24,
          },
          provenance: {
            git_sha: 'p' + 'e'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-node',
            determinism_hash: 'sha256:' + '2'.repeat(64),
          },
        },
      };

      await integration.ingestLineagePacket(packet, runContext, {
        promoted_to: 'production',
      });

      const check = integration.canPromoteToProd('build-20260609-009');
      expect(check.can_promote).toBe(true);
    });

    it('audit trail shows lineage→validation→council flow', async () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-010',
        packet_type: 'build_lineage',
        run_id: 'run-005',
        agent_id: 'inference.nemotron',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-010',
          agent_id: 'inference.nemotron',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'inference.nemotron:0.7.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/inference/nemotron:0.7.0',
              digest_sha256: 'q' + 'f'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-010',
            format: 'cyclonedx',
            ref_uri: 'sbom/inference-nemotron-0.7.0.xml',
            component_count: 30,
          },
          provenance: {
            git_sha: 'r' + '0'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'thefoundry-python-cuda',
            determinism_hash: 'sha256:' + '3'.repeat(64),
          },
        },
      };

      await integration.ingestLineagePacket(packet, runContext, {
        promoted_to: 'production',
      });

      const audit = integration.getPromotionAuditTrail('build-20260609-010');

      expect(audit.lineage).toBeDefined();
      expect(audit.validation).toBeDefined();
      expect(audit.council_vote).toBeDefined();
    });
  });

  describe('Packet Type Guard', () => {
    it('identifies BuildLineagePacket correctly', () => {
      const packet: BuildLineagePacket = {
        packet_id: 'pkt-011',
        packet_type: 'build_lineage',
        run_id: 'run-001',
        agent_id: 'cic.ingestion',
        phase: 'execution',
        timestamp: new Date().toISOString(),
        content: {
          build_id: 'build-20260609-011',
          agent_id: 'cic.ingestion',
          phase: 'execution',
          artifacts: [
            {
              artifact_id: 'test:1.0.0',
              artifact_type: 'container',
              registry_uri: 'registry.internal.cic/test:1.0.0',
              digest_sha256: 's' + '1'.repeat(63),
            },
          ],
          sbom: {
            sbom_id: 'sbom-011',
            format: 'cyclonedx',
            ref_uri: 'sbom/test-1.0.0.xml',
            component_count: 10,
          },
          provenance: {
            git_sha: 't' + '2'.repeat(39),
            timestamp: new Date().toISOString(),
            builder: 'test-builder',
            determinism_hash: 'sha256:' + '4'.repeat(64),
          },
        },
      };

      expect(isBuildLineagePacket(packet)).toBe(true);
    });
  });
});
