#!/usr/bin/env node
/**
 * deploy-skill.js
 * Operator-grade Cowork skill deployment script
 *
 * This script validates a local skill file and deploys it to the
 * local Claude agent's skill directory for use in Cowork.
 *
 * The target deployment directory can be configured via the
 * CLAUDE_SKILLS_DIR environment variable.
 *
 * Usage:
 *   node deploy-skill.js <skill-name> <path-to-skill.md>
 *   node deploy-skill.js cic-session-start ./SKILL.md
 *
 * Exit codes:
 *   0 = success
 *   1 = validation error
 *   2 = file system error
 *   3 = registration check failed
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---

// Using forward slashes in the path to avoid escaping issues.
// Node.js on Windows handles this correctly.
const DEFAULT_PLUGIN_SKILLS_DIR = 'C:/Users/soren/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/cb5a7ad7-52ca-4f55-8bf5-016d22440e98/de3b53f4-cead-4497-ab62-b7aa13f73d25/skills';
const PLUGIN_SKILLS_DIR = process.env.CLAUDE_SKILLS_DIR || DEFAULT_PLUGIN_SKILLS_DIR;

/**
 * Validate skill name follows naming conventions
 */
function validateSkillName(name) {
  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('Skill name is required and must be a string');
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
    errors.push('Skill name must be lowercase alphanumeric with hyphens (e.g., cic-session-start)');
  }

  if (name.length < 3) {
    errors.push('Skill name must be at least 3 characters');
  }

  if (name.length > 64) {
    errors.push('Skill name must be 64 characters or less');
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Validate SKILL.md content has proper frontmatter
 */
function validateSkillContent(content) {
  const errors = [];

  if (!content || typeof content !== 'string') {
    errors.push('Skill content is required and must be a string');
    return { valid: false, errors };
  }

  // Check for YAML frontmatter
  if (!content.startsWith('---')) {
    errors.push('SKILL.md must begin with YAML frontmatter (---)');
  } else {
    const endFrontmatterIndex = content.indexOf('
---
', 3);
    if (endFrontmatterIndex === -1) {
      errors.push('SKILL.md frontmatter is not properly closed (missing closing ---)');
    } else {
      const frontmatterSection = content.substring(3, endFrontmatterIndex);

      // Validate required fields
      if (!frontmatterSection.includes('name:')) {
        errors.push('SKILL.md frontmatter must include "name:" field');
      }
      if (!frontmatterSection.includes('description:')) {
        errors.push('SKILL.md frontmatter must include "description:" field');
      }
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Create skill directory and write SKILL.md
 */
function deploySkill(skillName, skillContent) {
  try {
    const skillDir = path.join(PLUGIN_SKILLS_DIR, skillName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
      console.log(`✓ Created directory: ${skillDir}`);
    } else {
      console.log(`✓ Directory already exists: ${skillDir}`);
    }

    // Write SKILL.md
    const skillFilePath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillFilePath, skillContent, 'utf8');
    console.log(`✓ Wrote SKILL.md to: ${skillFilePath}`);

    return { success: true, skillDir, skillFilePath };
  } catch (error) {
    return {
      success: false,
      error: `File system error: ${error.message}`,
      code: 2
    };
  }
}

/**
 * Verify skill file exists and is readable
 */
function verifySkillFile(skillFilePath) {
  try {
    const content = fs.readFileSync(skillFilePath, 'utf8');

    // Basic structural check
    if (!content.startsWith('---')) {
      return { valid: false, error: 'File exists but frontmatter is malformed' };
    }

    return { valid: true, fileSize: content.length };
  } catch (error) {
    return { valid: false, error: `Cannot read file: ${error.message}` };
  }
}

/**
 * Check if skill would register in Cowork
 * (Validates directory structure and file presence)
 */
function checkRegistration(skillName, skillDir) {
  const checks = {
    directoryExists: fs.existsSync(skillDir),
    skillMdExists: fs.existsSync(path.join(skillDir, 'SKILL.md')),
    parentDirIsSkills: path.basename(path.dirname(skillDir)) === 'skills'
  };

  const allChecksPassed = Object.values(checks).every(v => v === true);

  return {
    ready: allChecksPassed,
    checks,
    diagnostic: !allChecksPassed ?
      `Registration checks failed: ${Object.entries(checks)
        .filter(([_, v]) => !v)
        .map(([k]) => k)
        .join(', ')}` :
      'Ready for Cowork palette registration'
  };
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  if (args.length < 2) {
    console.error('Usage: node deploy-skill.js <skill-name> <path-to-skill.md>');
    console.error('Example: node deploy-skill.js cic-session-start ./SKILL.md');
    process.exit(1);
  }

  const skillName = args[0];
  const skillContentPath = args[1];

  // Load skill content from file
  let skillContent;
  try {
    skillContent = fs.readFileSync(skillContentPath, 'utf8');
  } catch (error) {
    console.error(`✗ Cannot read skill file: ${error.message}`);
    process.exit(2);
  }

  console.log(`Deploying skill: ${skillName}`);
  console.log(`Plugin skills directory: ${PLUGIN_SKILLS_DIR}`);

  // Validate skill name
  const nameValidation = validateSkillName(skillName);
  if (!nameValidation.valid) {
    console.error('✗ Skill name validation failed:');
    nameValidation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`✓ Skill name valid: ${skillName}`);

  // Validate skill content
  const contentValidation = validateSkillContent(skillContent);
  if (!contentValidation.valid) {
    console.error('✗ Skill content validation failed:');
    contentValidation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('✓ Skill content has valid YAML frontmatter');

  // Deploy skill
  const deployment = deploySkill(skillName, skillContent);
  if (!deployment.success) {
    console.error(`✗ ${deployment.error}`);
    process.exit(deployment.code || 2);
  }

  // Verify deployment
  const verification = verifySkillFile(deployment.skillFilePath);
  if (!verification.valid) {
    console.error(`✗ Verification failed: ${verification.error}`);
    process.exit(3);
  }
  console.log(`✓ File verified (${verification.fileSize} bytes)`);

  // Check registration readiness
  const registration = checkRegistration(skillName, deployment.skillDir);
  console.log(`
${registration.ready ? '✓' : '✗'} ${registration.diagnostic}`);

  if (registration.ready) {
    console.log(`
✓ DEPLOYMENT COMPLETE`);
    console.log(`
Next steps:`);
    console.log(`  1. Return to Cowork`);
    console.log(`  2. Refresh the slash command palette (Cmd/Ctrl+K)`);
    console.log(`  3. Invoke: /${skillName}`);
    process.exit(0);
  } else {
    console.log('
✗ DEPLOYMENT INCOMPLETE - Registration checks failed');
    console.log(`
Diagnostics:`);
    Object.entries(registration.checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✓' : '✗'} ${check}`);
    });
    process.exit(3);
  }
}

main();
