const fs = require('fs');
const path = require('path');
const CLIValidator = require('./cli-validator');

class CriterionEvaluator {
  constructor(config = {}) {
    this.config = config;
    this.validator = new CLIValidator(config);
  }

  evaluate(skillPath) {
    const skillName = path.basename(skillPath);
    const indexPath = path.join(skillPath, 'index.js');
    const schemaPath = path.join(skillPath, 'schema.json');
    const testPath = path.join(skillPath, 'index.test.js');
    const readmePath = path.join(skillPath, 'README.md');

    if (!fs.existsSync(indexPath)) {
      return {
        overallScore: 0,
        passed: false,
        error: `Missing index.js at ${indexPath}`,
        recommendation: 'CREATE_INDEX_JS'
      };
    }

    const code = fs.readFileSync(indexPath, 'utf-8');
    const schema = this._loadJSON(schemaPath);
    const testCode = fs.existsSync(testPath) ? fs.readFileSync(testPath, 'utf-8') : '';
    const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '';

    const criteria = {
      generalizability: this._evaluateGeneralizability(code, skillName),
      schemaCompleteness: this._evaluateSchemaCompleteness(schema),
      testCoverage: this._evaluateTestCoverage(testCode),
      documentation: this._evaluateDocumentation(readme),
      productionReadiness: this._evaluateProductionReadiness(code, testCode),
      nonCLISpecific: this._evaluateNonCLISpecific(code)
    };

    const overallScore = this._calculateOverallScore(criteria);
    const passed = overallScore >= 0.70 && this._allRequiredPassed(criteria);

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      passed,
      criteria,
      recommendation: this._getRecommendation(criteria, passed),
      reasoning: this._getReasoning(criteria, passed),
      warnings: this._getWarnings(criteria),
      nextSteps: this._getNextSteps(criteria, passed)
    };
  }

  _evaluateGeneralizability(code, skillName) {
    const cliCheck = this.validator.detectCLIPatterns(code);
    let score = 1.0;

    if (cliCheck.hasCliPatterns) {
      score -= cliCheck.patterns.length * 0.15;
    }

    if (/fs\.(read|write|watch)/.test(code)) {
      score -= 0.1;
    }

    score = Math.max(0, Math.min(1, score));

    return {
      score: Math.round(score * 100) / 100,
      passed: score >= 0.70,
      details: {
        cliPatterns: cliCheck.patterns.length,
        hasFileIO: /fs\.(read|write|watch)/.test(code)
      }
    };
  }

  _evaluateSchemaCompleteness(schema) {
    if (!schema) {
      return {
        score: 0,
        passed: false,
        error: 'Missing schema.json'
      };
    }

    const required = ['type', 'properties', 'required'];
    const hasRequired = required.every(key => key in schema);

    if (!hasRequired) {
      return {
        score: 0,
        passed: false,
        error: `Missing required fields: ${required.join(', ')}`
      };
    }

    const properties = Object.entries(schema.properties || {});
    const documented = properties.filter(([key, val]) => val.description).length;
    const score = properties.length > 0 ? documented / properties.length : 0;

    return {
      score: Math.round(score * 100) / 100,
      passed: true,
      details: {
        totalProperties: properties.length,
        documented,
        undocumented: properties.length - documented
      }
    };
  }

  _evaluateTestCoverage(testCode) {
    if (!testCode) {
      return {
        score: 0,
        passed: false,
        error: 'No test file found'
      };
    }

    const testCount = (testCode.match(/it\(['"]|describe\(['"]|test\(['"]test\(/g) || []).length;
    const hasErrors = /\.catch|\.rejects|toThrow|expect.*Error|should.*fail/i.test(testCode);

    if (testCount === 0) {
      return {
        score: 0,
        passed: false,
        error: 'No tests found'
      };
    }

    let score = Math.min(1, testCount / 20);
    if (!hasErrors) score -= 0.2;

    return {
      score: Math.round(score * 100) / 100,
      passed: score >= 0.80,
      details: {
        testCount,
        hasErrorCases: hasErrors,
        coverage: testCount >= 20 ? '80%+' : `${Math.round(testCount / 20 * 100)}%`
      }
    };
  }

  _evaluateDocumentation(readme) {
    if (!readme) {
      return {
        score: 0,
        passed: false,
        error: 'Missing README.md'
      };
    }

    let score = 0;
    const hasPurpose = /##\s+Purpose|##\s+Overview/.test(readme);
    const hasInputs = /##\s+Input|##\s+Parameters/.test(readme);
    const hasOutputs = /##\s+Output|##\s+Returns/.test(readme);
    const hasExamples = /##\s+Example|```javascript/.test(readme);

    if (hasPurpose) score += 0.25;
    if (hasInputs) score += 0.25;
    if (hasOutputs) score += 0.25;
    if (hasExamples) score += 0.25;

    return {
      score: Math.round(score * 100) / 100,
      passed: score >= 0.60,
      details: {
        hasPurpose,
        hasInputs,
        hasOutputs,
        hasExamples
      }
    };
  }

  _evaluateProductionReadiness(code, testCode) {
    let issues = 0;

    // Check for error handling
    const hasErrorHandling = /try\s*{|catch\s*\(|\.catch\(|if\s*\(.*error|if\s*\(.*err/.test(code);
    if (!hasErrorHandling) issues += 2;

    // Check for validation
    const hasValidation = /validate|schema|required|typeof|instanceof/.test(code);
    if (!hasValidation) issues += 1;

    // Check for logging
    const hasLogging = /logger\.|log\.|console\./.test(code);
    if (!hasLogging) issues += 1;

    // Code smells
    const smells = this.validator.detectCodeSmells(code);
    if (smells.some(s => s.severity === 'critical')) issues += 3;
    if (smells.some(s => s.severity === 'medium')) issues += 1;

    const score = Math.max(0, 1 - issues * 0.15);
    const criticalIssues = smells.filter(s => s.severity === 'critical');

    return {
      score: Math.round(score * 100) / 100,
      passed: criticalIssues.length === 0 && score >= 0.70,
      details: {
        hasErrorHandling,
        hasValidation,
        hasLogging,
        codeSmells: smells.length,
        criticalIssues: criticalIssues.length
      }
    };
  }

  _evaluateNonCLISpecific(code) {
    const cliCheck = this.validator.detectCLIPatterns(code);
    const hasCLIPatterns = cliCheck.hasCliPatterns;

    return {
      score: hasCLIPatterns ? 0 : 1,
      passed: !hasCLIPatterns,
      details: {
        hasCliPatterns: hasCLIPatterns,
        patterns: cliCheck.patterns.map(p => p.name)
      }
    };
  }

  _calculateOverallScore(criteria) {
    const weights = {
      generalizability: 0.25,
      schemaCompleteness: 0.20,
      testCoverage: 0.20,
      documentation: 0.15,
      productionReadiness: 0.15,
      nonCLISpecific: 0.05
    };

    let score = 0;
    Object.entries(criteria).forEach(([key, val]) => {
      score += (val.score || 0) * weights[key];
    });

    return score;
  }

  _allRequiredPassed(criteria) {
    const required = [
      'schemaCompleteness',
      'productionReadiness',
      'nonCLISpecific'
    ];
    return required.every(key => criteria[key].passed);
  }

  _getRecommendation(criteria, passed) {
    if (passed) return 'APPROVE_FOR_SHARED_LIBRARY';

    const cliPatterns = criteria.nonCLISpecific.details?.patterns || [];
    if (cliPatterns.length > 0) {
      return 'REQUEST_EXCEPTION_OR_MOVE_CLI_LOCAL';
    }

    if (!criteria.testCoverage.passed) {
      return 'ADD_TESTS';
    }

    if (!criteria.schemaCompleteness.passed) {
      return 'FIX_SCHEMA';
    }

    return 'IMPROVE_AND_RETRY';
  }

  _getReasoning(criteria, passed) {
    if (passed) {
      return 'Skill meets all criteria. Ready for shared library.';
    }

    const failures = Object.entries(criteria)
      .filter(([_, val]) => !val.passed)
      .map(([name, _]) => name)
      .join(', ');

    return `Skill fails criteria: ${failures}. Fix or request exception.`;
  }

  _getWarnings(criteria) {
    const warnings = [];

    if (criteria.testCoverage.score < 0.80) {
      warnings.push('Test coverage below 80% threshold');
    }

    if (criteria.documentation.score < 0.60) {
      warnings.push('Documentation incomplete (missing purpose, inputs, outputs, or examples)');
    }

    if (criteria.generalizability.details?.cliPatterns > 0) {
      warnings.push(`Found ${criteria.generalizability.details.cliPatterns} CLI-specific patterns`);
    }

    return warnings;
  }

  _getNextSteps(criteria, passed) {
    if (passed) {
      return [
        'Commit to skills/ directory',
        'Add to skill manifest (skill-tool-config.json)',
        'Deploy via standard process'
      ];
    }

    const steps = [];
    if (!criteria.testCoverage.passed) {
      steps.push('Add tests to achieve 80%+ coverage');
    }
    if (!criteria.schemaCompleteness.passed) {
      steps.push('Fix schema.json: add type, properties, required, descriptions');
    }
    if (!criteria.documentation.passed) {
      steps.push('Create README.md with purpose, inputs, outputs, examples');
    }
    if (!criteria.nonCLISpecific.passed) {
      steps.push(
        'Option A: Remove CLI-specific code and retry',
        'Option B: Request exception in PR (if truly CLI-native)',
        'Option C: Move to cli-local-skills/ (local-only skills)'
      );
    }

    return steps;
  }

  _loadJSON(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }
}

module.exports = CriterionEvaluator;
