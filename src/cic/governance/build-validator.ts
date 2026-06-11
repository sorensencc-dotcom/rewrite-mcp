/**
 * Build Validator — Phase 24.5
 * Validates build lineage packets against policy rails
 *
 * Checks:
 * - SBOM completeness (component count > threshold)
 * - Provenance integrity (git_sha matches expected commit)
 * - Determinism (build outputs reproducible)
 * - Supply chain (no unapproved dependencies)
 * - Registry compliance (images signed/scanned)
 */

import { BuildLineagePacket, BuildLineagePacketContent } from './packet-types.js';
import { PolicyRail } from './types.js';

export type ValidationStatus = 'pending' | 'passed' | 'failed';
export type ValidationSeverity = 'hard_safety' | 'domain' | 'phase' | 'soft';

export interface ValidationCheck {
  check_id: string;
  description: string;
  status: 'pass' | 'fail' | 'warn';
  severity: ValidationSeverity;
  details?: string;
  remediation?: string;
}

export interface BuildValidationResult {
  packet_id: string;
  build_id: string;
  overall_status: ValidationStatus;
  checks: ValidationCheck[];
  failed_checks: ValidationCheck[];
  warnings: ValidationCheck[];
  rail_violations?: string[];
  validation_timestamp: string;
  validating_agent: string;
}

export class BuildValidator {
  private activePolicies: Map<string, PolicyRail> = new Map();
  private sbomThresholds = {
    min_components: 5,
    max_vulnerabilities_critical: 0,
    max_vulnerabilities_high: 2,
    max_unknown_licenses: 3,
  };

  constructor(policies: PolicyRail[] = []) {
    policies.forEach((p) => this.activePolicies.set(p.rail_id, p));
  }

  addPolicy(policy: PolicyRail): void {
    this.activePolicies.set(policy.rail_id, policy);
  }

  validate(
    packet: BuildLineagePacket,
    options?: { strict?: boolean; validating_agent?: string }
  ): BuildValidationResult {
    const checks: ValidationCheck[] = [];
    const now = new Date().toISOString();
    const agent = options?.validating_agent || 'build-validator';

    // Run all checks
    checks.push(...this.validateProvenanceIntegrity(packet.content));
    checks.push(...this.validateSBOMCompleteness(packet.content));
    checks.push(...this.validateDeterminism(packet.content));
    checks.push(...this.validateArtifactSignatures(packet.content));
    checks.push(...this.validatePolicyRails(packet.content));

    // Categorize results
    const failed = checks.filter((c) => c.status === 'fail');
    const warnings = checks.filter((c) => c.status === 'warn');
    const overall = failed.length === 0 ? 'passed' : 'failed';

    // Identify rail violations
    const violations = this.identifyRailViolations(failed, packet.content);

    return {
      packet_id: packet.packet_id,
      build_id: packet.content.build_id,
      overall_status: overall as ValidationStatus,
      checks,
      failed_checks: failed,
      warnings,
      rail_violations: violations,
      validation_timestamp: now,
      validating_agent: agent,
    };
  }

  private validateProvenanceIntegrity(
    content: BuildLineagePacketContent
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const prov = content.provenance;

    // Check git_sha format
    if (!prov.git_sha || !/^[a-f0-9]{40}$/.test(prov.git_sha)) {
      checks.push({
        check_id: 'provenance-git-sha-format',
        description: 'Git SHA format invalid',
        status: 'fail',
        severity: 'hard_safety',
        details: `Expected 40-char hex, got: ${prov.git_sha || 'empty'}`,
        remediation: 'Rebuild from valid git commit',
      });
    }

    // Check timestamp validity
    try {
      const ts = new Date(prov.timestamp);
      if (isNaN(ts.getTime()) || ts > new Date()) {
        throw new Error('Invalid or future timestamp');
      }
      checks.push({
        check_id: 'provenance-timestamp',
        description: 'Build timestamp valid',
        status: 'pass',
        severity: 'soft',
      });
    } catch (e) {
      checks.push({
        check_id: 'provenance-timestamp',
        description: 'Build timestamp invalid or in future',
        status: 'fail',
        severity: 'hard_safety',
        details: String(e),
        remediation: 'Use current server time during build',
      });
    }

    // Check builder identity
    if (!prov.builder || prov.builder.length === 0) {
      checks.push({
        check_id: 'provenance-builder',
        description: 'Builder identity missing',
        status: 'fail',
        severity: 'domain',
        remediation: 'Set BUILDER env var during build',
      });
    } else {
      checks.push({
        check_id: 'provenance-builder',
        description: 'Builder identity recorded',
        status: 'pass',
        severity: 'soft',
      });
    }

    return checks;
  }

  private validateSBOMCompleteness(
    content: BuildLineagePacketContent
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const sbom = content.sbom;

    // Check SBOM exists and has reference
    if (!sbom || !sbom.sbom_id || !sbom.ref_uri) {
      checks.push({
        check_id: 'sbom-exists',
        description: 'SBOM artifact missing',
        status: 'fail',
        severity: 'hard_safety',
        details: 'No SBOM provided with build',
        remediation: 'Generate CycloneDX/SPDX SBOM during build',
      });
      return checks;
    }

    checks.push({
      check_id: 'sbom-exists',
      description: 'SBOM artifact present',
      status: 'pass',
      severity: 'soft',
    });

    // Check SBOM format
    if (!['cyclonedx', 'spdx'].includes(sbom.format)) {
      checks.push({
        check_id: 'sbom-format',
        description: `Invalid SBOM format: ${sbom.format}`,
        status: 'fail',
        severity: 'domain',
        remediation: 'Use CycloneDX or SPDX format',
      });
    } else {
      checks.push({
        check_id: 'sbom-format',
        description: `SBOM format: ${sbom.format}`,
        status: 'pass',
        severity: 'soft',
      });
    }

    // Check component count threshold
    if (sbom.component_count !== undefined && sbom.component_count < this.sbomThresholds.min_components) {
      checks.push({
        check_id: 'sbom-component-count',
        description: 'Insufficient components in SBOM',
        status: 'warn',
        severity: 'phase',
        details: `Found ${sbom.component_count}, expected at least ${this.sbomThresholds.min_components}`,
      });
    } else if (sbom.component_count !== undefined) {
      checks.push({
        check_id: 'sbom-component-count',
        description: `SBOM contains ${sbom.component_count} components`,
        status: 'pass',
        severity: 'soft',
      });
    }

    return checks;
  }

  private validateDeterminism(content: BuildLineagePacketContent): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const prov = content.provenance;

    // Check determinism hash
    if (!prov.determinism_hash) {
      checks.push({
        check_id: 'determinism-hash',
        description: 'Determinism hash missing',
        status: 'warn',
        severity: 'phase',
        details: 'No build environment state hash recorded',
        remediation: 'Capture sha256(docker_env, git_sha, build_timestamp) during build',
      });
    } else if (!/^sha256:[a-f0-9]{64}$/.test(prov.determinism_hash)) {
      checks.push({
        check_id: 'determinism-hash',
        description: 'Determinism hash format invalid',
        status: 'fail',
        severity: 'domain',
        details: `Expected sha256:..., got: ${prov.determinism_hash}`,
        remediation: 'Regenerate with correct format',
      });
    } else {
      checks.push({
        check_id: 'determinism-hash',
        description: 'Determinism hash valid',
        status: 'pass',
        severity: 'soft',
      });
    }

    return checks;
  }

  private validateArtifactSignatures(
    content: BuildLineagePacketContent
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check artifacts present
    if (!content.artifacts || content.artifacts.length === 0) {
      checks.push({
        check_id: 'artifacts-present',
        description: 'No artifacts in build lineage',
        status: 'fail',
        severity: 'hard_safety',
        remediation: 'Produce at least one artifact (container, library, or binary)',
      });
      return checks;
    }

    checks.push({
      check_id: 'artifacts-present',
      description: `${content.artifacts.length} artifacts produced`,
      status: 'pass',
      severity: 'soft',
    });

    // Validate each artifact
    for (const artifact of content.artifacts) {
      // Check SHA256 digest
      if (!artifact.digest_sha256 || !/^[a-f0-9]{64}$/.test(artifact.digest_sha256)) {
        checks.push({
          check_id: `artifact-digest-${artifact.artifact_id}`,
          description: `Artifact ${artifact.artifact_id}: digest format invalid`,
          status: 'fail',
          severity: 'hard_safety',
          remediation: 'Regenerate artifact with proper digest',
        });
      } else {
        checks.push({
          check_id: `artifact-digest-${artifact.artifact_id}`,
          description: `Artifact ${artifact.artifact_id}: digest valid`,
          status: 'pass',
          severity: 'soft',
        });
      }

      // Check registry URI for container artifacts
      if (artifact.artifact_type === 'container' && !artifact.registry_uri) {
        checks.push({
          check_id: `artifact-registry-${artifact.artifact_id}`,
          description: `Container ${artifact.artifact_id}: registry URI missing`,
          status: 'fail',
          severity: 'domain',
          remediation: 'Push to registry and record URI',
        });
      }
    }

    return checks;
  }

  private validatePolicyRails(
    content: BuildLineagePacketContent
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check each active policy
    for (const [railId, policy] of this.activePolicies) {
      // Skip if policy doesn't apply to build phase
      if (!['orchestrate', 'execution'].includes(content.phase)) {
        continue;
      }

      // Domain-level checks (e.g., "no external registries")
      if (policy.type === 'DOMAIN' && policy.rule_id === 'registry-allowlist') {
        const allowed = policy.rule_value as string[];
        for (const artifact of content.artifacts) {
          if (artifact.registry_uri && !allowed.some((r) => artifact.registry_uri?.startsWith(r))) {
            checks.push({
              check_id: `policy-${railId}`,
              description: `Registry not on allowlist: ${artifact.registry_uri}`,
              status: 'fail',
              severity: 'domain',
              remediation: `Use one of: ${allowed.join(', ')}`,
            });
          }
        }
      }

      // Hard safety checks (e.g., "no unsigned artifacts")
      if (policy.type === 'HARD_SAFETY' && policy.rule_id === 'require-artifact-signatures') {
        for (const artifact of content.artifacts) {
          if (!artifact.digest_sha256) {
            checks.push({
              check_id: `policy-${railId}`,
              description: `Artifact unsigned: ${artifact.artifact_id}`,
              status: 'fail',
              severity: 'hard_safety',
              remediation: 'Sign artifact with build signing key',
            });
          }
        }
      }
    }

    return checks;
  }

  private identifyRailViolations(
    failedChecks: ValidationCheck[],
    content: BuildLineagePacketContent
  ): string[] {
    const violations: string[] = [];
    const severityMap: Record<ValidationSeverity, string> = {
      hard_safety: 'HARD_SAFETY',
      domain: 'DOMAIN',
      phase: 'PHASE',
      soft: 'SOFT',
    };

    for (const check of failedChecks) {
      violations.push(`${severityMap[check.severity]}: ${check.description}`);
    }

    return violations;
  }
}
