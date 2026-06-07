/**
 * Phase Validator Skill (45.7)
 *
 * Comprehensive artifact validation for phase deliverables.
 * Validates schemas, tests, policy compliance, and documentation.
 */

export async function phaseValidator(params) {
  const startTime = Date.now();

  try {
    validateInput(params);

    const {
      phaseId,
      artifacts,
      validationMode = 'strict',
      checkSchema = true,
      checkTests = true,
      checkPolicy = true,
      checkDocumentation = true,
      minTestCoverage = 80,
      minPolicyScore = 0.75,
      reportFormat = 'detailed'
    } = params;

    const validationResults = [];
    const summary = {
      totalArtifacts: artifacts.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };

    // Validate each artifact
    for (const artifact of artifacts) {
      const result = await validateArtifact(
        artifact,
        {
          checkSchema,
          checkTests,
          checkPolicy,
          checkDocumentation,
          minTestCoverage,
          minPolicyScore
        },
        validationMode
      );

      validationResults.push(result);

      if (result.valid) {
        summary.passed++;
      } else {
        summary.failed++;
        summary.errors.push(...result.errors);
      }

      if (result.warnings.length > 0) {
        summary.warnings += result.warnings.length;
      }
    }

    // Compute overall compliance score
    const complianceScore = summary.passed / Math.max(1, summary.totalArtifacts);

    // Generate report
    const report = generateReport(
      phaseId,
      validationResults,
      summary,
      complianceScore,
      reportFormat
    );

    const elapsed = Date.now() - startTime;

    return {
      success: summary.failed === 0,
      validationId: generateValidationId(),
      phaseId,
      complianceScore: parseFloat(complianceScore.toFixed(3)),
      summary,
      report,
      recommendations: generateRecommendations(validationResults, summary),
      elapsedMs: elapsed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      validationId: 'error-' + generateValidationId().split('-')[1],
      elapsedMs: Date.now() - startTime
    };
  }
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('params must be an object');
  }

  if (!params.phaseId || typeof params.phaseId !== 'string') {
    throw new Error('phaseId is required and must be a string');
  }

  if (!params.artifacts || !Array.isArray(params.artifacts) || params.artifacts.length === 0) {
    throw new Error('artifacts must be a non-empty array');
  }

  if (params.artifacts.length > 100) {
    throw new Error('artifacts array cannot exceed 100 items');
  }

  params.artifacts.forEach((a, idx) => {
    if (!a.type || !['schema', 'implementation', 'test', 'documentation', 'benchmark', 'assessment'].includes(a.type)) {
      throw new Error(`artifact[${idx}]: type must be one of the valid types`);
    }
    if (!a.path || typeof a.path !== 'string') {
      throw new Error(`artifact[${idx}]: path is required and must be a string`);
    }
  });

  if (params.minTestCoverage && (params.minTestCoverage < 0 || params.minTestCoverage > 100)) {
    throw new Error('minTestCoverage must be between 0 and 100');
  }

  if (params.minPolicyScore && (params.minPolicyScore < 0 || params.minPolicyScore > 1)) {
    throw new Error('minPolicyScore must be between 0 and 1');
  }
}

/**
 * Validate individual artifact
 */
async function validateArtifact(artifact, options, mode) {
  const errors = [];
  const warnings = [];
  const checks = {};

  // Schema validation
  if (options.checkSchema && artifact.type === 'schema') {
    const schemaCheck = validateSchema(artifact);
    checks.schema = schemaCheck;
    if (!schemaCheck.valid) errors.push(...schemaCheck.errors);
    if (schemaCheck.warnings) warnings.push(...schemaCheck.warnings);
  }

  // Test coverage validation
  if (options.checkTests && artifact.type === 'test') {
    const testCheck = validateTestFile(artifact, options.minTestCoverage);
    checks.tests = testCheck;
    if (!testCheck.valid) errors.push(...testCheck.errors);
    if (testCheck.warnings) warnings.push(...testCheck.warnings);
  }

  // Policy compliance validation (skip for non-implementation artifacts)
  const codeArtifactTypes = ['implementation', 'assessment'];
  if (options.checkPolicy && codeArtifactTypes.includes(artifact.type)) {
    const policyCheck = validatePolicy(artifact, options.minPolicyScore);
    checks.policy = policyCheck;
    if (!policyCheck.valid) errors.push(...policyCheck.errors);
    if (policyCheck.warnings) warnings.push(...policyCheck.warnings);
  } else if (options.checkPolicy) {
    // For non-code artifacts, just check they have content
    const hasContent = artifact.content && artifact.content.length > 0;
    checks.policy = { valid: hasContent, score: hasContent ? 0.8 : 0.3 };
    if (!hasContent && artifact.type !== 'benchmark') {
      errors.push('Artifact is missing content');
    }
  }

  // Documentation validation
  if (options.checkDocumentation && artifact.type === 'documentation') {
    const docCheck = validateDocumentation(artifact);
    checks.documentation = docCheck;
    if (!docCheck.valid) errors.push(...docCheck.errors);
    if (docCheck.warnings) warnings.push(...docCheck.warnings);
  }

  return {
    artifact: artifact.path,
    type: artifact.type,
    valid: errors.length === 0,
    errors,
    warnings,
    checks
  };
}

/**
 * Validate JSON schema
 */
function validateSchema(artifact) {
  const errors = [];
  const warnings = [];

  if (!artifact.content) {
    return { valid: false, errors: ['Schema content is missing'] };
  }

  try {
    const schema = JSON.parse(artifact.content);

    // Check required fields
    if (!schema.$schema) warnings.push('Missing $schema field');
    if (!schema.title) warnings.push('Missing title field');
    if (!schema.type && !schema.oneOf && !schema.anyOf) {
      errors.push('Schema must define type or composition');
    }
    if (!schema.properties && schema.type === 'object') {
      warnings.push('Object schema without properties');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : null
    };
  } catch (e) {
    return {
      valid: false,
      errors: ['Invalid JSON: ' + e.message]
    };
  }
}

/**
 * Validate test file
 */
function validateTestFile(artifact, minCoverage) {
  const errors = [];
  const warnings = [];

  if (!artifact.content) {
    return { valid: false, errors: ['Test content is missing'] };
  }

  // Check for test file patterns
  if (!artifact.content.includes('describe') && !artifact.content.includes('test(')) {
    errors.push('No test suite found (missing describe or test blocks)');
  }

  // Count test cases (rough estimation)
  const testCount = (artifact.content.match(/it\s*\(/g) || []).length;
  if (testCount === 0) {
    errors.push('No test cases found (missing it blocks)');
  }

  // Check for expect statements
  const expectCount = (artifact.content.match(/expect\s*\(/g) || []).length;
  if (expectCount < testCount) {
    warnings.push(`Low assertion count: ${expectCount} expects for ${testCount} tests`);
  }

  // Estimate coverage (simple heuristic)
  const estimatedCoverage = Math.min(100, (expectCount / Math.max(1, testCount)) * 50);
  if (estimatedCoverage < minCoverage) {
    warnings.push(`Estimated coverage ${estimatedCoverage.toFixed(0)}% below target ${minCoverage}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : null,
    coverage: { estimated: estimatedCoverage, testCount, expectCount }
  };
}

/**
 * Validate policy compliance
 */
function validatePolicy(artifact, minScore) {
  const errors = [];
  const warnings = [];
  let score = 0.5; // Base score

  // Input validation check
  if (artifact.content && artifact.content.includes('validateInput')) {
    score += 0.2;
  } else if (artifact.type !== 'documentation') {
    warnings.push('No input validation found');
  }

  // Error handling check
  if (artifact.content && artifact.content.includes('try') && artifact.content.includes('catch')) {
    score += 0.15;
  }

  // Documentation check
  if (artifact.content && artifact.content.includes('/**')) {
    score += 0.1;
  }

  // Test coverage
  if (artifact.type === 'test' || (artifact.content && artifact.content.includes('expect'))) {
    score += 0.15;
  }

  score = Math.min(1, score);

  if (score < minScore) {
    errors.push(`Policy score ${score.toFixed(3)} below minimum ${minScore}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : null,
    score: parseFloat(score.toFixed(3))
  };
}

/**
 * Validate documentation
 */
function validateDocumentation(artifact) {
  const errors = [];
  const warnings = [];

  if (!artifact.content) {
    return { valid: false, errors: ['Documentation content is missing'] };
  }

  const content = artifact.content.toLowerCase();

  // Check for required sections
  const requiredSections = ['purpose', 'usage', 'example', 'error'];
  const missingSections = requiredSections.filter(s => !content.includes(s));

  if (missingSections.length > 0) {
    warnings.push(`Missing sections: ${missingSections.join(', ')}`);
  }

  // Check for code examples
  if (!artifact.content.includes('```')) {
    warnings.push('No code examples found');
  }

  // Check length
  if (artifact.content.length < 500) {
    warnings.push('Documentation may be too brief');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : null,
    sections: requiredSections.filter(s => content.includes(s))
  };
}

/**
 * Generate validation report
 */
function generateReport(phaseId, results, summary, score, format) {
  if (format === 'json') {
    return {
      phaseId,
      timestamp: new Date().toISOString(),
      summary,
      results,
      score
    };
  } else if (format === 'text') {
    return `Phase ${phaseId} Validation Report\n` +
      `Status: ${summary.failed === 0 ? 'PASS' : 'FAIL'}\n` +
      `Artifacts: ${summary.passed}/${summary.totalArtifacts} passed\n` +
      `Compliance: ${(score * 100).toFixed(1)}%`;
  } else {
    // Detailed format
    return {
      phase: phaseId,
      timestamp: new Date().toISOString(),
      overallStatus: summary.failed === 0 ? 'PASS' : 'FAIL',
      complianceScore: score,
      artifactSummary: {
        total: summary.totalArtifacts,
        passed: summary.passed,
        failed: summary.failed
      },
      detailedResults: results.map(r => ({
        artifact: r.artifact,
        status: r.valid ? 'PASS' : 'FAIL',
        errorCount: r.errors.length,
        warningCount: r.warnings.length,
        checks: r.checks
      })),
      allErrors: summary.errors
    };
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(results, summary) {
  const recommendations = [];

  if (summary.failed > 0) {
    recommendations.push(`Fix ${summary.failed} failing artifact(s)`);
  }

  if (summary.warnings > 0) {
    recommendations.push(`Address ${summary.warnings} warning(s)`);
  }

  const schemaErrors = results.filter(r => r.type === 'schema' && !r.valid);
  if (schemaErrors.length > 0) {
    recommendations.push('Review and fix schema validation errors');
  }

  const testErrors = results.filter(r => r.type === 'test' && !r.valid);
  if (testErrors.length > 0) {
    recommendations.push('Improve test coverage and add missing assertions');
  }

  const policyErrors = results.filter(r => r.checks.policy && !r.checks.policy.valid);
  if (policyErrors.length > 0) {
    recommendations.push('Enhance policy compliance (input validation, error handling, docs)');
  }

  return recommendations.length > 0 ? recommendations : ['All validations passed'];
}

/**
 * Generate unique validation ID
 */
function generateValidationId() {
  return `validate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
