#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const CriterionEvaluator = require('./criterion-evaluator');
const ExceptionManager = require('./exception-manager');
const PolicyReportGenerator = require('./policy-report-generator');

const config = require('./config.json');

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const command = args[0];
  const skillPath = args[1];

  switch (command) {
    case 'check':
      if (!skillPath) {
        console.error('Error: skill path required');
        process.exit(1);
      }
      checkSkill(skillPath);
      break;

    case 'report':
      if (!skillPath) {
        console.error('Error: skill path required');
        process.exit(1);
      }
      generateReport(skillPath);
      break;

    case 'exceptions':
      manageExceptions(args.slice(1));
      break;

    case 'audit':
      auditAllSkills();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function checkSkill(skillPath) {
  const evaluator = new CriterionEvaluator(config);
  const exceptions = new ExceptionManager(config.exceptionRegistry);

  const skillName = path.basename(skillPath);

  // Check if skill has exception
  if (exceptions.hasException(skillName)) {
    console.log(`✅ Skill '${skillName}' has approved exception`);
    const exception = exceptions.getException(skillName);
    console.log(`   Reason: ${exception.reason}`);
    console.log(`   Approved by: ${exception.approvedBy}`);
    if (exception.sunsetDate !== 'never') {
      console.log(`   Sunset date: ${exception.sunsetDate}`);
    }
    process.exit(0);
  }

  // Evaluate skill
  const verdict = evaluator.evaluate(skillPath);

  console.log(`\n📋 Policy Evaluation: ${skillName}\n`);
  console.log(`Score: ${verdict.overallScore} / 1.00`);
  console.log(`Status: ${verdict.passed ? '✅ PASS' : '❌ FAIL'}\n`);

  if (!verdict.passed) {
    console.log('Criteria Results:\n');
    Object.entries(verdict.criteria).forEach(([key, result]) => {
      const status = result.passed ? '✅' : '❌';
      const score = typeof result.score === 'number' ? ` (${Math.round(result.score * 100)}%)` : '';
      console.log(`${status} ${key}${score}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log(`\n⚠️  Recommendation: ${verdict.recommendation}\n`);
    console.log('Options:\n');
    console.log('1. Fix the skill:');
    verdict.nextSteps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`);
    });
    console.log('\n2. Request exception (if CLI-native): run `npm run policy:exceptions -- add --name=...`');
    console.log('3. Move to cli-local-skills/ (if local-only)\n');

    process.exit(1);
  } else {
    console.log('✅ Skill approved for shared library!\n');
    console.log('Next steps:');
    verdict.nextSteps.forEach((step, i) => {
      console.log(`${i + 1}. ${step}`);
    });
    console.log('');
    process.exit(0);
  }
}

function generateReport(skillPath) {
  const evaluator = new CriterionEvaluator(config);
  const generator = new PolicyReportGenerator(config.reportDir);

  const skillName = path.basename(skillPath);
  const verdict = evaluator.evaluate(skillPath);

  const { reportPath, markdown } = generator.generate(skillName, verdict);

  console.log(`📄 Report generated: ${reportPath}\n`);
  console.log(markdown);
}

function manageExceptions(args) {
  const exceptions = new ExceptionManager(config.exceptionRegistry);

  if (args.length === 0 || args[0] === 'list') {
    const list = exceptions.list();
    if (list.length === 0) {
      console.log('No exceptions registered.\n');
    } else {
      console.log(`${list.length} exception(s):\n`);
      list.forEach(e => {
        console.log(`- ${e.name}`);
        console.log(`  Reason: ${e.reason}`);
        console.log(`  Approved: ${e.approvedBy} (${e.date})`);
        if (e.sunsetDate !== 'never') {
          console.log(`  Sunset: ${e.sunsetDate}`);
        }
        console.log('');
      });
    }
  } else if (args[0] === 'add') {
    const params = {};
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1];
      params[key] = val;
    }

    if (!params.name || !params.approver || !params.reason || !params['review-url']) {
      console.error('Error: --name, --approver, --reason, --review-url required');
      process.exit(1);
    }

    const exception = exceptions.addException({
      name: params.name,
      reason: params.reason,
      approvedBy: params.approver,
      date: new Date().toISOString().split('T')[0],
      reviewUrl: params['review-url'],
      sunsetDate: params['sunset-date'] || 'never'
    });

    exceptions.save();

    console.log(`✅ Exception registered: ${exception.name}`);
    console.log(`   Reason: ${exception.reason}`);
    console.log(`   Approved by: ${exception.approvedBy}`);
    console.log('');
  }
}

function auditAllSkills() {
  const skillsDir = 'skills';

  if (!fs.existsSync(skillsDir)) {
    console.log('No skills directory found.');
    process.exit(0);
  }

  const evaluator = new CriterionEvaluator(config);
  const skills = fs.readdirSync(skillsDir).filter(f => {
    return fs.statSync(path.join(skillsDir, f)).isDirectory();
  });

  if (skills.length === 0) {
    console.log('No skills found.');
    process.exit(0);
  }

  console.log(`\n🔍 Auditing ${skills.length} skill(s)...\n`);

  let passed = 0;
  let failed = 0;

  skills.forEach(skill => {
    const verdict = evaluator.evaluate(path.join(skillsDir, skill));
    const status = verdict.passed ? '✅' : '❌';
    const score = Math.round(verdict.overallScore * 100);

    console.log(`${status} ${skill} (${score}%)`);

    if (verdict.passed) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

function printUsage() {
  console.log(`
Skills Policy Agent

Usage:
  npm run policy:check -- <skill-path>          # Evaluate a skill
  npm run policy:report -- <skill-path>         # Generate detailed report
  npm run policy:exceptions -- list              # List exceptions
  npm run policy:exceptions -- add \\
    --name=<name> \\
    --approver=<handle> \\
    --reason="<reason>" \\
    --review-url=<url> \\
    [--sunset-date=YYYY-MM-DD]                  # Register exception
  npm run policy:audit                           # Audit all skills

Examples:
  npm run policy:check -- skills/my-skill
  npm run policy:exceptions -- add --name=cli-version-checker --approver=@soren --reason="Reads package.json" --review-url="https://..."
  npm run policy:audit
`);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkSkill,
  generateReport,
  manageExceptions,
  auditAllSkills
};
