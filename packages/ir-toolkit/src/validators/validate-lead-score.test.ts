import {
  ValidationError,
  validateScoringInput,
  validateLeadScoreResult,
  validateIRPacket,
  assertValid
} from './validate-lead-score.js';
import type { ScoringInput, LeadScoreResult } from '../schemas/lead-score.types.js';
import type { IRPacket } from '../schemas/ir.types.js';

describe('ValidationError', () => {
  it('is instance of Error', () => {
    const error = new ValidationError('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('test message');
  });
});

describe('validateScoringInput', () => {
  const validInput: ScoringInput = {
    complexity: {
      score: 60,
      factors: {
        componentDiversity: 20,
        routeDepth: 10,
        assetCount: 100,
        stateVariations: 50
      }
    },
    audit: {
      issues: [],
      severity: 'medium',
      total: 10
    },
    accessibility: {
      wcagLevel: 'AA',
      issues: [],
      passedTests: 40,
      failedTests: 10,
      score: 80
    }
  };

  it('accepts valid scoring input', () => {
    expect(validateScoringInput(validInput)).toBe(true);
  });

  it('rejects null', () => {
    expect(() => validateScoringInput(null)).toThrow(ValidationError);
    expect(() => validateScoringInput(null)).toThrow('must be an object');
  });

  it('rejects non-object', () => {
    expect(() => validateScoringInput('invalid')).toThrow(ValidationError);
  });

  it('rejects missing complexity', () => {
    const invalid = { ...validInput };
    delete (invalid as any).complexity;

    expect(() => validateScoringInput(invalid)).toThrow('complexity is required');
  });

  it('rejects invalid complexity.score', () => {
    const invalid = {
      ...validInput,
      complexity: { ...validInput.complexity, score: 'not a number' }
    };

    expect(() => validateScoringInput(invalid)).toThrow('complexity.score must be a number');
  });

  it('rejects missing audit', () => {
    const invalid = { ...validInput };
    delete (invalid as any).audit;

    expect(() => validateScoringInput(invalid)).toThrow('audit is required');
  });

  it('rejects non-array audit.issues', () => {
    const invalid = {
      ...validInput,
      audit: { ...validInput.audit, issues: 'not an array' }
    };

    expect(() => validateScoringInput(invalid)).toThrow('audit.issues must be an array');
  });

  it('rejects invalid audit.total', () => {
    const invalid = {
      ...validInput,
      audit: { ...validInput.audit, total: 'not a number' }
    };

    expect(() => validateScoringInput(invalid)).toThrow('audit.total must be a number');
  });

  it('rejects missing accessibility', () => {
    const invalid = { ...validInput };
    delete (invalid as any).accessibility;

    expect(() => validateScoringInput(invalid)).toThrow('accessibility is required');
  });

  it('rejects invalid accessibility.score', () => {
    const invalid = {
      ...validInput,
      accessibility: { ...validInput.accessibility, score: 'not a number' }
    };

    expect(() => validateScoringInput(invalid)).toThrow('accessibility.score must be a number');
  });

  it('accepts input with optional competitive field', () => {
    const withCompetitive: ScoringInput = {
      ...validInput,
      competitive: [
        { category: 'performance', severity: 'high', description: 'Slow', impact: 'UX' }
      ]
    };

    expect(validateScoringInput(withCompetitive)).toBe(true);
  });
});

describe('validateLeadScoreResult', () => {
  const validResult: LeadScoreResult = {
    score: 75,
    tier: 'A',
    percentile: 75,
    factors: {
      complexity: { value: 70, weight: 0.35, contribution: 24.5 },
      audit: { value: 80, weight: 0.3, contribution: 24 },
      accessibility: { value: 75, weight: 0.2, contribution: 15 },
      competitive: { value: 70, weight: 0.15, contribution: 10.5 }
    },
    summary: 'Excellent opportunity',
    insights: ['High complexity'],
    recommendations: ['Schedule call'],
    salesReady: true,
    estimatedComplexity: 'high',
    nextSteps: ['1. Generate preview', '2. Calculate pricing']
  };

  it('accepts valid lead score result', () => {
    expect(validateLeadScoreResult(validResult)).toBe(true);
  });

  it('rejects null', () => {
    expect(() => validateLeadScoreResult(null)).toThrow(ValidationError);
  });

  it('rejects non-object', () => {
    expect(() => validateLeadScoreResult('invalid')).toThrow(ValidationError);
  });

  it('rejects score outside 0-100 range', () => {
    const invalid = { ...validResult, score: 150 };
    expect(() => validateLeadScoreResult(invalid)).toThrow('score must be a number between 0 and 100');
  });

  it('rejects negative score', () => {
    const invalid = { ...validResult, score: -10 };
    expect(() => validateLeadScoreResult(invalid)).toThrow('score must be a number between 0 and 100');
  });

  it('rejects invalid tier', () => {
    const invalid = { ...validResult, tier: 'X' as any };
    expect(() => validateLeadScoreResult(invalid)).toThrow('tier must be A, B, C, or D');
  });

  it('accepts all valid tiers', () => {
    for (const tier of ['A', 'B', 'C', 'D'] as const) {
      const result = { ...validResult, tier };
      expect(validateLeadScoreResult(result)).toBe(true);
    }
  });

  it('rejects non-string summary', () => {
    const invalid = { ...validResult, summary: 123 };
    expect(() => validateLeadScoreResult(invalid)).toThrow('summary must be a string');
  });

  it('rejects non-array insights', () => {
    const invalid = { ...validResult, insights: 'not an array' };
    expect(() => validateLeadScoreResult(invalid)).toThrow('insights must be an array of strings');
  });

  it('rejects insights with non-string elements', () => {
    const invalid = { ...validResult, insights: ['valid', 123] };
    expect(() => validateLeadScoreResult(invalid)).toThrow('insights must be an array of strings');
  });

  it('rejects non-array recommendations', () => {
    const invalid = { ...validResult, recommendations: 'not an array' };
    expect(() => validateLeadScoreResult(invalid)).toThrow('recommendations must be an array of strings');
  });

  it('rejects non-boolean salesReady', () => {
    const invalid = { ...validResult, salesReady: 'yes' };
    expect(() => validateLeadScoreResult(invalid)).toThrow('salesReady must be a boolean');
  });
});

describe('validateIRPacket', () => {
  const validPacket: IRPacket = {
    version: '1.0.0',
    meta: {
      url: 'https://example.com',
      captureDate: new Date().toISOString(),
      toolVersion: '1.0.0'
    },
    designTokens: {},
    routes: [{ path: '/', componentIds: ['a'], assetCount: 5 }],
    components: [
      { id: 'a', name: 'Component A', type: 'section', usageCount: 1 }
    ],
    assets: { images: 5, videos: 0, svgs: 2, total: 7 }
  };

  it('accepts valid IR packet', () => {
    expect(validateIRPacket(validPacket)).toBe(true);
  });

  it('rejects null', () => {
    expect(() => validateIRPacket(null)).toThrow(ValidationError);
  });

  it('rejects non-object', () => {
    expect(() => validateIRPacket('invalid')).toThrow(ValidationError);
  });

  it('rejects missing version', () => {
    const invalid = { ...validPacket };
    delete (invalid as any).version;

    expect(() => validateIRPacket(invalid)).toThrow('version must be a string');
  });

  it('rejects non-string version', () => {
    const invalid = { ...validPacket, version: 1 };
    expect(() => validateIRPacket(invalid)).toThrow('version must be a string');
  });

  it('rejects missing meta', () => {
    const invalid = { ...validPacket };
    delete (invalid as any).meta;

    expect(() => validateIRPacket(invalid)).toThrow('meta is required');
  });

  it('rejects missing meta.url', () => {
    const invalid = { ...validPacket, meta: { ...validPacket.meta } };
    delete (invalid.meta as any).url;

    expect(() => validateIRPacket(invalid)).toThrow('meta.url must be a string');
  });

  it('rejects non-string meta.url', () => {
    const invalid = {
      ...validPacket,
      meta: { ...validPacket.meta, url: 123 }
    };

    expect(() => validateIRPacket(invalid)).toThrow('meta.url must be a string');
  });

  it('rejects non-array routes', () => {
    const invalid = { ...validPacket, routes: 'not an array' };
    expect(() => validateIRPacket(invalid)).toThrow('routes must be an array');
  });

  it('rejects non-array components', () => {
    const invalid = { ...validPacket, components: 'not an array' };
    expect(() => validateIRPacket(invalid)).toThrow('components must be an array');
  });

  it('rejects missing assets', () => {
    const invalid = { ...validPacket };
    delete (invalid as any).assets;

    expect(() => validateIRPacket(invalid)).toThrow('assets is required');
  });
});

describe('assertValid', () => {
  it('returns void on valid input', () => {
    const validator = (input: unknown): input is string => typeof input === 'string';
    const result = assertValid(validator, 'test', 'string');
    expect(result).toBeUndefined();
  });

  it('throws ValidationError on invalid input', () => {
    const validator = (input: unknown): input is string => typeof input === 'string';
    expect(() => assertValid(validator, 123, 'string')).toThrow(ValidationError);
  });

  it('includes context in error message', () => {
    const validator = (input: unknown): input is string => {
      throw new Error('Original error');
    };
    expect(() => assertValid(validator, 'input', 'test context')).toThrow(
      'test context validation failed'
    );
  });

  it('preserves ValidationError from validator', () => {
    const validator = (input: unknown): input is string => {
      throw new ValidationError('Specific error');
    };
    expect(() => assertValid(validator, 'input', 'context')).toThrow('Specific error');
  });
});
