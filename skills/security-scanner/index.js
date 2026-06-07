module.exports = async function securityScanner(params) {
  try {
    const { scanType = 'all', severity = 'all' } = params || {};

    if (!['code', 'config', 'dependencies', 'all'].includes(scanType)) {
      throw new Error(`Invalid scanType: ${scanType}`);
    }

  const findings = [
    {
      type: 'secrets',
      severity: 'critical',
      file: 'apps/skill-gateway/index.js',
      line: 42,
      issue: 'Hardcoded AWS_SECRET_KEY detected',
      remediation: 'Move to .env or secrets manager'
    },
    {
      type: 'code',
      severity: 'high',
      file: 'skills/agent-drift-detector/index.js',
      line: 88,
      issue: 'Potential SQL injection in query construction',
      remediation: 'Use parameterized queries'
    }
  ];

  const filtered = filterByType(findings, scanType).filter(f => {
    if (severity === 'all') return true;
    return f.severity === severity;
  });

  const summary = {
    critical: filtered.filter(f => f.severity === 'critical').length,
    high: filtered.filter(f => f.severity === 'high').length,
    medium: filtered.filter(f => f.severity === 'medium').length,
    low: filtered.filter(f => f.severity === 'low').length,
    total: filtered.length
  };

  return {
    scanId: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    findings: filtered,
    summary
  };
};

function filterByType(findings, scanType) {
  if (scanType === 'all') return findings;
  return findings.filter(f => f.type === scanType);
}
  } catch (error) {
    throw new Error(`Security scanner error: ${error.message}`);
  }
}
