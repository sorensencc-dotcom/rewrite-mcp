const fs = require('fs');
const path = require('path');

class PolicyReportGenerator {
  constructor(reportDir = 'reports/policy') {
    this.reportDir = reportDir;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
  }

  generate(skillName, verdict) {
    const timestamp = new Date().toISOString();
    const report = {
      skillName,
      timestamp,
      verdict: verdict.overallScore >= 0.70 && verdict.passed
        ? 'PASS'
        : 'FAIL',
      overallScore: verdict.overallScore,
      passed: verdict.passed,
      recommendation: verdict.recommendation,
      reasoning: verdict.reasoning,
      criteria: verdict.criteria,
      warnings: verdict.warnings,
      nextSteps: verdict.nextSteps
    };

    const markdown = this._generateMarkdown(report);
    const filename = `${skillName}-${new Date().toISOString().split('T')[0]}.md`;
    const reportPath = path.join(this.reportDir, filename);

    fs.writeFileSync(reportPath, markdown, 'utf-8');

    return {
      report,
      reportPath,
      markdown
    };
  }

  _generateMarkdown(report) {
    const status = report.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const score = `${Math.round(report.overallScore * 100)}%`;

    let md = `# Policy Evaluation Report

**Skill:** ${report.skillName}
**Date:** ${report.timestamp}
**Status:** ${status}
**Overall Score:** ${score}

---

## Summary

${report.reasoning}

**Recommendation:** ${this._humanizeRecommendation(report.recommendation)}

---

## Detailed Criteria

`;

    Object.entries(report.criteria).forEach(([name, result]) => {
      const status = result.passed ? '✅' : '❌';
      const score = typeof result.score === 'number' ? `${Math.round(result.score * 100)}%` : 'N/A';

      md += `### ${this._humanizeCriterion(name)} ${status}\n\n`;
      md += `**Score:** ${score}\n`;

      if (result.error) {
        md += `**Error:** ${result.error}\n`;
      } else if (result.details) {
        md += `**Details:**\n`;
        Object.entries(result.details).forEach(([key, val]) => {
          md += `- ${this._humanizeKey(key)}: ${val}\n`;
        });
      }

      md += '\n';
    });

    if (report.warnings.length > 0) {
      md += `## Warnings\n\n`;
      report.warnings.forEach(w => {
        md += `- ⚠️ ${w}\n`;
      });
      md += '\n';
    }

    md += `## Next Steps\n\n`;
    report.nextSteps.forEach((step, i) => {
      md += `${i + 1}. ${step}\n`;
    });

    md += `\n---\n\n`;
    md += `**Generated:** ${report.timestamp}\n`;

    return md;
  }

  _humanizeRecommendation(rec) {
    const map = {
      'APPROVE_FOR_SHARED_LIBRARY': 'Approve for shared library',
      'REQUEST_EXCEPTION_OR_MOVE_CLI_LOCAL': 'Request exception or move to cli-local-skills/',
      'ADD_TESTS': 'Add more tests',
      'FIX_SCHEMA': 'Fix schema.json',
      'IMPROVE_AND_RETRY': 'Improve and retry evaluation'
    };
    return map[rec] || rec;
  }

  _humanizeCriterion(name) {
    const map = {
      generalizability: 'Generalizability',
      schemaCompleteness: 'Schema Completeness',
      testCoverage: 'Test Coverage',
      documentation: 'Documentation',
      productionReadiness: 'Production Readiness',
      nonCLISpecific: 'Non-CLI-Specific'
    };
    return map[name] || name;
  }

  _humanizeKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

module.exports = PolicyReportGenerator;
