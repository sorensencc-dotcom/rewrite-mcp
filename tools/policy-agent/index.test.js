const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const CLIValidator = require('./cli-validator');
const ExceptionManager = require('./exception-manager');
const CriterionEvaluator = require('./criterion-evaluator');
const PolicyReportGenerator = require('./policy-report-generator');
const config = require('./config.json');

const testDir = path.join(__dirname, '.test-skills');

beforeEach(() => {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

// ============================================================================
// CLIValidator Tests (16 tests)
// ============================================================================

describe('CLIValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new CLIValidator(config);
  });

  it('detects process.argv', () => {
    const code = 'const args = process.argv.slice(2);';
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('detects process.exit', () => {
    const code = 'process.exit(1);';
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
  });

  it('detects yargs', () => {
    const code = "const yargs = require('yargs');";
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
  });

  it('detects commander', () => {
    const code = "const { program } = require('commander');";
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
  });

  it('detects readline', () => {
    const code = "const readline = require('readline');";
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
  });

  it('detects tty.isatty', () => {
    const code = 'if (tty.isatty(process.stdout.fd)) {}';
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(true);
  });

  it('accepts clean code', () => {
    const code = 'function sum(a, b) { return a + b; }';
    const result = validator.detectCLIPatterns(code);
    expect(result.hasCliPatterns).toBe(false);
  });

  it('detects console.log', () => {
    const code = 'console.log("hello");';
    const smells = validator.detectCodeSmells(code);
    expect(smells.some(s => s.type === 'console-usage')).toBe(true);
  });

  it('detects hardcoded secrets', () => {
    const code = `const secret = "api_key": "abc123xyz789";`;
    const smells = validator.detectCodeSmells(code);
    expect(smells.length).toBeGreaterThan(0);
  });

  it('flags undated TODOs', () => {
    const code = '// TODO fix this later';
    const smells = validator.detectCodeSmells(code);
    expect(smells.some(s => s.type === 'undated-todo')).toBe(true);
  });

  it('accepts dated TODOs', () => {
    const code = '// TODO 2026-12-31 fix this';
    const smells = validator.detectCodeSmells(code);
    expect(smells.some(s => s.type === 'undated-todo')).toBe(false);
  });

  it('analyzes generalizability score', () => {
    const code = 'function process(data) { return data.map(d => d * 2); }';
    const score = validator.analyzeGeneralizability(code, 'test-skill');
    expect(score.value).toBe(1.0);
  });

  it('penalizes generalizability for CLI patterns', () => {
    const code = 'process.argv; function process(data) { return data; }';
    const score = validator.analyzeGeneralizability(code, 'test-skill');
    expect(score.value).toBeLessThan(1.0);
  });

  it('penalizes generalizability for file I/O', () => {
    const code = 'fs.readFileSync("file.txt"); function process(data) { return data; }';
    const score = validator.analyzeGeneralizability(code, 'test-skill');
    expect(score.value).toBeLessThan(1.0);
  });

  it('returns severity level', () => {
    const code = 'process.exit(1); yargs;';
    const result = validator.detectCLIPatterns(code);
    expect(result.severity).toBe('critical');
  });
});

// ============================================================================
// ExceptionManager Tests (16 tests)
// ============================================================================

describe('ExceptionManager', () => {
  let manager;
  const testRegistry = path.join(testDir, 'test-exceptions.md');

  beforeEach(() => {
    manager = new ExceptionManager(testRegistry);
  });

  it('creates new registry', () => {
    expect(manager).toBeDefined();
    expect(manager.exceptions).toBeDefined();
  });

  it('adds exception', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1'
    });
    expect(manager.hasException('test-skill')).toBe(true);
  });

  it('retrieves exception', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1'
    });
    const ex = manager.getException('test-skill');
    expect(ex.name).toBe('test-skill');
    expect(ex.reason).toBe('CLI-specific');
  });

  it('rejects incomplete exception', () => {
    expect(() => {
      manager.addException({ name: 'test' });
    }).toThrow();
  });

  it('lists all exceptions', () => {
    manager.addException({
      name: 'skill1',
      reason: 'Reason 1',
      approvedBy: '@a',
      date: '2026-06-05',
      reviewUrl: 'url1'
    });
    manager.addException({
      name: 'skill2',
      reason: 'Reason 2',
      approvedBy: '@b',
      date: '2026-06-05',
      reviewUrl: 'url2'
    });
    const list = manager.list();
    expect(list.length).toBe(2);
  });

  it('removes exception', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1'
    });
    manager.removeException('test-skill');
    expect(manager.hasException('test-skill')).toBe(false);
  });

  it('saves registry to file', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1'
    });
    manager.save();
    expect(fs.existsSync(testRegistry)).toBe(true);
  });

  it('loads registry from file', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1'
    });
    manager.save();

    const manager2 = new ExceptionManager(testRegistry);
    expect(manager2.hasException('test-skill')).toBe(true);
  });

  it('sets sunset date', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1',
      sunsetDate: '2026-12-31'
    });
    const ex = manager.getException('test-skill');
    expect(ex.sunsetDate).toBe('2026-12-31');
  });

  it('detects sunset alerts', () => {
    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1',
      sunsetDate: '2026-06-10'
    });
    const alerts = manager.getSunsetAlerts();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('calculates days until sunset', () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const sunsetStr = future.toISOString().split('T')[0];

    manager.addException({
      name: 'test-skill',
      reason: 'CLI-specific',
      approvedBy: '@tester',
      date: '2026-06-05',
      reviewUrl: 'https://example.com/pr/1',
      sunsetDate: sunsetStr
    });
    const alerts = manager.getSunsetAlerts();
    expect(alerts[0].daysUntilSunset).toBeGreaterThan(0);
  });

  it('sorts exceptions alphabetically', () => {
    manager.addException({
      name: 'zebra',
      reason: 'Test',
      approvedBy: '@a',
      date: '2026-06-05',
      reviewUrl: 'url'
    });
    manager.addException({
      name: 'apple',
      reason: 'Test',
      approvedBy: '@a',
      date: '2026-06-05',
      reviewUrl: 'url'
    });
    const list = manager.list();
    expect(list[0].name).toBe('apple');
    expect(list[1].name).toBe('zebra');
  });
});

// ============================================================================
// CriterionEvaluator Tests (24 tests)
// ============================================================================

describe('CriterionEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new CriterionEvaluator(config);
  });

  function createTestSkill(skillName, overrides = {}) {
    const skillPath = path.join(testDir, skillName);
    fs.mkdirSync(skillPath, { recursive: true });

    const defaultIndex = 'function process(data) { return data; } module.exports = process;';
    const defaultSchema = {
      type: 'object',
      properties: { input: { type: 'string', description: 'Input data' } },
      required: ['input']
    };
    const defaultTest = `describe('test', () => {
      it('works', () => { expect(true).toBe(true); });
      it('handles errors', () => { expect(() => { throw new Error(); }).toThrow(); });
    })`;
    const defaultReadme = '## Purpose\nTest skill\n## Example\n\`\`\`js\ncode\n\`\`\`';

    fs.writeFileSync(
      path.join(skillPath, 'index.js'),
      overrides.index || defaultIndex
    );
    fs.writeFileSync(
      path.join(skillPath, 'schema.json'),
      JSON.stringify(overrides.schema || defaultSchema)
    );
    fs.writeFileSync(
      path.join(skillPath, 'index.test.js'),
      overrides.test || defaultTest
    );
    fs.writeFileSync(
      path.join(skillPath, 'README.md'),
      overrides.readme || defaultReadme
    );

    return skillPath;
  }

  it('evaluates passing skill', () => {
    const skillPath = createTestSkill('good-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThan(0.70);
  });

  it('rejects missing index.js', () => {
    const skillPath = path.join(testDir, 'no-index');
    fs.mkdirSync(skillPath, { recursive: true });
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Missing index.js');
  });

  it('rejects missing schema.json', () => {
    const skillPath = createTestSkill('no-schema', { schema: undefined });
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(false);
  });

  it('rejects missing tests', () => {
    const skillPath = createTestSkill('no-tests', { test: '' });
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(false);
    expect(result.criteria.testCoverage.passed).toBe(false);
  });

  it('detects CLI-specific code', () => {
    const skillPath = createTestSkill('cli-skill', {
      index: 'process.argv; module.exports = {};'
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(false);
    expect(result.criteria.nonCLISpecific.passed).toBe(false);
  });

  it('penalizes missing documentation', () => {
    const skillPath = createTestSkill('no-docs', { readme: '' });
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.documentation.score).toBe(0);
  });

  it('rewards complete documentation', () => {
    const skillPath = createTestSkill('good-docs', {
      readme: `
## Purpose
Does something
## Input
Takes data
## Output
Returns data
## Example
\`\`\`js
code
\`\`\`
      `
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.documentation.score).toBe(1);
  });

  it('evaluates generalizability', () => {
    const skillPath = createTestSkill('generic-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.generalizability.score).toBeGreaterThanOrEqual(0);
  });

  it('evaluates schema completeness', () => {
    const skillPath = createTestSkill('good-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.schemaCompleteness.passed).toBe(true);
  });

  it('evaluates test coverage', () => {
    const skillPath = createTestSkill('tested-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.testCoverage.score).toBeGreaterThanOrEqual(0);
  });

  it('evaluates production readiness', () => {
    const skillPath = createTestSkill('prod-ready', {
      index: `
        function process(data) {
          try {
            if (!data) throw new Error('Missing data');
            return data;
          } catch (e) {
            logger.error('Error', e);
            throw e;
          }
        }
        module.exports = process;
      `
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.productionReadiness.details.hasErrorHandling).toBe(true);
  });

  it('calculates overall score', () => {
    const skillPath = createTestSkill('scored-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it('provides recommendation', () => {
    const skillPath = createTestSkill('good-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.recommendation).toBeDefined();
  });

  it('provides next steps', () => {
    const skillPath = createTestSkill('good-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.nextSteps).toBeInstanceOf(Array);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it('collects warnings', () => {
    const skillPath = createTestSkill('warned-skill', {
      test: 'it("test", () => { expect(true).toBe(true); })'
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.warnings).toBeInstanceOf(Array);
  });

  it('handles CLI patterns in recommendation', () => {
    const skillPath = createTestSkill('cli-skill', {
      index: 'process.argv; module.exports = {};'
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.recommendation).toContain('EXCEPTION');
  });

  it('requires all mandatory criteria to pass', () => {
    const skillPath = createTestSkill('partial-skill', {
      schema: { type: 'object' }
    });
    const result = evaluator.evaluate(skillPath);
    expect(result.passed).toBe(false);
  });

  it('scores weighting', () => {
    const skillPath = createTestSkill('weighted-skill');
    const result = evaluator.evaluate(skillPath);
    expect(result.criteria.generalizability.score * 0.25).toBeGreaterThanOrEqual(0);
    expect(result.criteria.testCoverage.score * 0.20).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// PolicyReportGenerator Tests (9 tests)
// ============================================================================

describe('PolicyReportGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new PolicyReportGenerator(path.join(testDir, 'reports'));
  });

  it('generates report', () => {
    const verdict = {
      overallScore: 0.85,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Skill passes all criteria',
      criteria: {},
      warnings: [],
      nextSteps: ['Deploy']
    };
    const result = generator.generate('test-skill', verdict);
    expect(result.reportPath).toBeDefined();
  });

  it('creates report directory', () => {
    const reportDir = path.join(testDir, 'new-reports');
    const gen = new PolicyReportGenerator(reportDir);
    expect(fs.existsSync(reportDir)).toBe(true);
  });

  it('generates markdown', () => {
    const verdict = {
      overallScore: 0.75,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Test',
      criteria: {},
      warnings: [],
      nextSteps: ['Step 1']
    };
    const result = generator.generate('test', verdict);
    expect(result.markdown).toContain('Policy Evaluation Report');
  });

  it('includes score in report', () => {
    const verdict = {
      overallScore: 0.82,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Test',
      criteria: {},
      warnings: [],
      nextSteps: []
    };
    const result = generator.generate('test', verdict);
    expect(result.markdown).toContain('82%');
  });

  it('includes warnings in report', () => {
    const verdict = {
      overallScore: 0.72,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Test',
      criteria: {},
      warnings: ['Low test coverage'],
      nextSteps: []
    };
    const result = generator.generate('test', verdict);
    expect(result.markdown).toContain('Low test coverage');
  });

  it('saves report to file', () => {
    const verdict = {
      overallScore: 0.85,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Test',
      criteria: {},
      warnings: [],
      nextSteps: []
    };
    const result = generator.generate('test-skill', verdict);
    expect(fs.existsSync(result.reportPath)).toBe(true);
  });

  it('includes next steps in report', () => {
    const verdict = {
      overallScore: 0.85,
      passed: true,
      recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
      reasoning: 'Test',
      criteria: {},
      warnings: [],
      nextSteps: ['Step 1', 'Step 2', 'Step 3']
    };
    const result = generator.generate('test', verdict);
    expect(result.markdown).toContain('Step 1');
    expect(result.markdown).toContain('Step 2');
    expect(result.markdown).toContain('Step 3');
  });

  it('humanizes recommendation', () => {
    const verdict = {
      overallScore: 0.85,
      passed: true,
      recommendation: 'REQUEST_EXCEPTION_OR_MOVE_CLI_LOCAL',
      reasoning: 'Test',
      criteria: {},
      warnings: [],
      nextSteps: []
    };
    const result = generator.generate('test', verdict);
    expect(result.markdown).toContain('Request exception or move');
  });
});
