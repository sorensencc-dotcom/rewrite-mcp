import { describe, it, expect, beforeEach } from 'vitest';
import { phaseValidator } from './index.js';

describe('Phase Validator (45.7)', () => {
  const mockArtifact = (overrides = {}) => ({
    type: 'schema',
    path: 'test/schema.json',
    content: JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title: 'Test' }),
    ...overrides
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should validate required phaseId', async () => {
    const result = await phaseValidator({
      artifacts: [mockArtifact()]
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('phaseId');
  });

  it('should validate artifacts array', async () => {
    const result = await phaseValidator({
      phaseId: '45'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('artifacts');
  });

  it('should validate single schema artifact', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        content: JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'Test Schema',
          type: 'object',
          properties: { id: { type: 'string' } }
        })
      })]
    });

    expect(result.success).toBe(true);
    expect(result.complianceScore).toBeGreaterThan(0);
    expect(result.summary.totalArtifacts).toBe(1);
  });

  it('should validate multiple artifacts', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [
        mockArtifact({ type: 'schema' }),
        mockArtifact({
          type: 'implementation',
          path: 'test/index.js',
          content: `
            function test(params) {
              validateInput(params);
              try {
                // Implementation
              } catch (error) {
                return { error: error.message };
              }
            }
            function validateInput(p) { if (!p) throw Error(); }
          `
        }),
        mockArtifact({ type: 'test', path: 'test/test.js', content: 'describe("test", () => { it("works", () => { expect(true).toBe(true); }); })' })
      ]
    });

    expect(result.success).toBe(true);
    expect(result.summary.totalArtifacts).toBe(3);
  });

  it('should detect schema validation errors', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        content: 'invalid json'
      })]
    });

    expect(result.success).toBe(false);
    expect(result.summary.failed).toBe(1);
  });

  it('should validate test coverage', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'test',
        content: 'describe("test", () => { it("case 1", () => { expect(1).toBe(1); }); it("case 2", () => { expect(2).toBe(2); }); });'
      })],
      checkTests: true,
      minTestCoverage: 50
    });

    expect(result.success).toBe(true);
  });

  it('should check policy compliance', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'implementation',
        content: `
          function test(params) {
            try {
              validateInput(params);
              // Implementation
            } catch (error) {
              return { error: error.message };
            }
          }
          function validateInput(params) {
            if (!params) throw new Error('params required');
          }
        `
      })],
      checkPolicy: true,
      minPolicyScore: 0.5
    });

    expect(result.success).toBe(true);
  });

  it('should validate documentation', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'documentation',
        content: `
# Test Skill

## Purpose
This is a test skill for validation.

## Usage
\`\`\`javascript
const result = await testSkill();
\`\`\`

## Error Handling
Returns error object on failure.
        `
      })],
      checkDocumentation: true
    });

    expect(result.success).toBe(true);
  });

  it('should track validation statistics', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [
        mockArtifact({ type: 'schema' }),
        mockArtifact({ type: 'implementation' }),
        mockArtifact({ type: 'test' })
      ]
    });

    expect(result.summary.totalArtifacts).toBe(3);
    expect(result.summary.passed + result.summary.failed).toBe(3);
  });

  it('should compute compliance score', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [
        mockArtifact({ type: 'schema' }),
        mockArtifact({ type: 'implementation' })
      ]
    });

    expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    expect(result.complianceScore).toBeLessThanOrEqual(1);
  });

  it('should support validation modes', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()],
      validationMode: 'strict'
    });

    expect(result.validationId).toBeDefined();
  });

  it('should support JSON report format', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'schema',
        content: JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' })
      })],
      reportFormat: 'json'
    });

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(typeof result.report).toBe('object');
  });

  it('should support text report format', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'schema',
        content: JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' })
      })],
      reportFormat: 'text'
    });

    expect(result.success).toBe(true);
    expect(typeof result.report).toBe('string');
    expect(result.report).toContain('Phase');
  });

  it('should support detailed report format', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'schema',
        content: JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' })
      })],
      reportFormat: 'detailed'
    });

    expect(result.success).toBe(true);
    expect(result.report.phase).toBe('45');
    expect(result.report.detailedResults).toBeDefined();
  });

  it('should generate recommendations', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()]
    });

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('should validate artifact array size limit', async () => {
    const artifacts = Array.from({ length: 101 }, (_, i) =>
      mockArtifact({ path: `artifact-${i}.json` })
    );

    const result = await phaseValidator({
      phaseId: '45',
      artifacts
    });

    expect(result.success).toBe(false);
  });

  it('should validate minTestCoverage parameter', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()],
      minTestCoverage: 150
    });

    expect(result.success).toBe(false);
  });

  it('should validate minPolicyScore parameter', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()],
      minPolicyScore: 1.5
    });

    expect(result.success).toBe(false);
  });

  it('should include timing information', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()]
    });

    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('should generate unique validation IDs', async () => {
    const result1 = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()]
    });

    const result2 = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact()]
    });

    expect(result1.validationId).not.toEqual(result2.validationId);
  });

  it('should validate schema with missing fields', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        content: JSON.stringify({ type: 'object' })
      })],
      validationMode: 'strict'
    });

    expect(result.success).toBe(true);
    expect(result.summary.warnings).toBeGreaterThan(0);
  });

  it('should validate test files with multiple test cases', async () => {
    const testContent = `
      describe('suite', () => {
        it('test 1', () => { expect(1).toBe(1); });
        it('test 2', () => { expect(2).toBe(2); });
        it('test 3', () => { expect(3).toBe(3); });
      });
    `;

    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        type: 'test',
        content: testContent
      })],
      minTestCoverage: 50
    });

    expect(result.success).toBe(true);
  });

  it('should handle artifacts without content', async () => {
    const result = await phaseValidator({
      phaseId: '45',
      artifacts: [mockArtifact({
        content: undefined
      })],
      validationMode: 'strict'
    });

    expect(result.summary.failed).toBeGreaterThan(0);
  });

  it('should validate complex phase with multiple artifact types', async () => {
    const result = await phaseValidator({
      phaseId: '45.7',
      artifacts: [
        mockArtifact({
          type: 'schema',
          path: 'schema.json',
          content: JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title: 'Test', type: 'object' })
        }),
        mockArtifact({
          type: 'implementation',
          path: 'index.js',
          content: `
            function validate(p) {
              validateInput(p);
              try {
                if(!p) throw new Error();
              } catch(e) {
                return {error: e};
              }
            }
            function validateInput(p) { if (!p) throw new Error('required'); }
          `
        }),
        mockArtifact({
          type: 'test',
          path: 'index.test.js',
          content: 'describe("test", () => { it("validates", () => { expect(true).toBe(true); }); });'
        }),
        mockArtifact({
          type: 'documentation',
          path: 'README.md',
          content: '# Validator\n## Purpose\nValidates artifacts\n## Usage\n```js\nvalidate()\n```\n## Error Handling\nReturns errors'
        })
      ]
    });

    expect(result.success).toBe(true);
    expect(result.summary.totalArtifacts).toBe(4);
  });
});
