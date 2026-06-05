const fs = require('fs');
const path = require('path');

class CLIValidator {
  constructor(config = {}) {
    this.patterns = config.cliPatterns || [
      'process.argv',
      'process.exit',
      'yargs',
      'commander',
      'readline',
      'tty.isatty',
      'fs.watch',
      'child_process'
    ];
    this.codeSmells = config.codeSmells || [
      'console.log',
      'console.error',
      'hardcoded API keys'
    ];
  }

  detectCLIPatterns(code) {
    const detected = [];

    this.patterns.forEach(pattern => {
      const regex = this._patternToRegex(pattern);
      if (regex.test(code)) {
        detected.push({
          name: pattern,
          severity: this._getSeverity(pattern),
          found: true
        });
      }
    });

    return {
      hasCliPatterns: detected.length > 0,
      patterns: detected,
      severity: this._calculateSeverity(detected)
    };
  }

  detectCodeSmells(code) {
    const smells = [];

    // console.log/error/warn usage
    if (/console\.(log|error|warn|info)\s*\(/.test(code)) {
      smells.push({
        type: 'console-usage',
        severity: 'medium',
        message: 'Direct console logging detected (use logging library instead)',
        fixable: true
      });
    }

    // Hardcoded strings that look like secrets
    if (/['"](?:api_key|secret|password|token)['"]:\s*['"][a-zA-Z0-9+/=]{20,}['"]/.test(code)) {
      smells.push({
        type: 'hardcoded-secret',
        severity: 'critical',
        message: 'Hardcoded secret or API key detected',
        fixable: false
      });
    }

    // TODO without deadline
    if (/\/\/\s*TODO(?!\s+\d{4}-\d{2}-\d{2})/.test(code)) {
      smells.push({
        type: 'undated-todo',
        severity: 'low',
        message: 'TODO without deadline (format: TODO YYYY-MM-DD)',
        fixable: true
      });
    }

    return smells;
  }

  analyzeGeneralizability(code, skillName) {
    const score = { value: 1.0, factors: {} };

    // Check for CLI-specific imports
    const cliPatterns = this.detectCLIPatterns(code);
    if (cliPatterns.hasCliPatterns) {
      const penaltyPerPattern = 0.15;
      const penalty = Math.min(
        cliPatterns.patterns.length * penaltyPerPattern,
        0.5
      );
      score.value -= penalty;
      score.factors.cliSpecificity = {
        penalty,
        reason: `Found ${cliPatterns.patterns.length} CLI-specific pattern(s)`
      };
    }

    // Check for external service dependencies (AWS, GCP, etc)
    const externalServices = ['@aws-sdk', 'googleapis', '@azure', 'octokit'];
    const hasExternalDeps = externalServices.some(svc => code.includes(svc));
    if (hasExternalDeps) {
      score.factors.externalDependency = {
        impact: 'neutral',
        reason: 'Depends on external service SDK (acceptable if generalizable)'
      };
    }

    // Check for file I/O (less generalizable in headless contexts)
    if (/fs\.(read|write|watch)/.test(code)) {
      score.value -= 0.1;
      score.factors.fileIO = {
        penalty: 0.1,
        reason: 'Direct file I/O may not work in all contexts'
      };
    }

    score.value = Math.max(0, Math.min(1, score.value));
    return score;
  }

  _patternToRegex(pattern) {
    // Escape special chars, then create a word-boundary aware regex
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b|require\\(['"]${escaped}['"]\\)|import.*['"]${escaped}['"]`);
  }

  _getSeverity(pattern) {
    const criticalPatterns = [
      'process.argv',
      'process.exit',
      'yargs',
      'commander',
      'readline'
    ];
    return criticalPatterns.includes(pattern) ? 'critical' : 'high';
  }

  _calculateSeverity(patterns) {
    if (patterns.some(p => p.severity === 'critical')) return 'critical';
    if (patterns.some(p => p.severity === 'high')) return 'high';
    return 'medium';
  }
}

module.exports = CLIValidator;
