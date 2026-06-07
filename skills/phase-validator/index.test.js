import { describe, it, expect } from 'vitest';
import { phaseValidator } from './index.js';
const mockArtifact = (o = {}) => ({ type: 'schema', path: 'test.json', content: '{}', ...o });

describe('Phase Validator (45.7)', () => {
  it('should require phaseId', async () => {
    const r = await phaseValidator({ artifacts: [mockArtifact()] });
    expect(r.success).toBe(false);
  });

  it('should validate artifacts', async () => {
    const r = await phaseValidator({ phaseId: '45', artifacts: [mockArtifact()] });
    expect(r.success).toBe(true);
    expect(r.summary.totalArtifacts).toBe(1);
  });

  it('should compute compliance score', async () => {
    const r = await phaseValidator({ phaseId: '45', artifacts: [mockArtifact(), mockArtifact({ type: 'test' })] });
    expect(r.complianceScore).toBeGreaterThanOrEqual(0);
    expect(r.complianceScore).toBeLessThanOrEqual(1);
  });

  it('should track validation results', async () => {
    const r = await phaseValidator({ phaseId: '45', artifacts: [mockArtifact()] });
    expect(r.summary.passed).toBeGreaterThanOrEqual(0);
    expect(r.summary.failed).toBeGreaterThanOrEqual(0);
  });

  it('should generate report', async () => {
    const r = await phaseValidator({ phaseId: '45', artifacts: [mockArtifact()] });
    expect(r.report).toBeDefined();
    expect(r.report.phase).toBe('45');
  });

  it('should include timing', async () => {
    const r = await phaseValidator({ phaseId: '45', artifacts: [mockArtifact()] });
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
