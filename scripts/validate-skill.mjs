#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const FRONTMATTER_REGEX = /^---\s*[
]+([\s\S]*?)[
]+---/;

async function validateSkill(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      throw new Error('File must start with a YAML frontmatter block enclosed by ---.');
    }

    const frontmatter = match[1];
    const lines = frontmatter.split(/[
]+/).filter(line => line.trim() !== '');

    const requiredKeys = ['name', 'description'];
    const foundKeys = lines.map(line => line.split(':')[0].trim());

    for (const key of requiredKeys) {
      if (!foundKeys.includes(key)) {
        throw new Error(`YAML frontmatter is missing the required key: "${key}".`);
      }
    }

    // Check if keys have values
    for (const line of lines) {
        const parts = line.split(':');
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (requiredKeys.includes(key) && !value) {
            throw new Error(`The required key "${key}" must have a value.`);
        }
    }

    return { filePath, valid: true };
  } catch (error) {
    return { filePath, valid: false, error: error.message };
  }
}

async function main() {
  const filesToValidate = process.argv.slice(2);
  if (filesToValidate.length === 0) {
    console.log('Usage: node validate-skill.mjs <file1> <file2> ...');
    process.exit(0);
  }

  console.log(`[Skill Validator] Checking ${filesToValidate.length} skill file(s)...`);

  const results = await Promise.all(filesToValidate.map(validateSkill));

  const invalidFiles = results.filter(r => !r.valid);

  if (invalidFiles.length > 0) {
    console.error('
Validation failed for the following files:');
    for (const { filePath, error } of invalidFiles) {
      console.error(`  - ${path.basename(filePath)}: ${error}`);
    }
    console.error('
Please fix the errors before committing.');
    process.exit(1);
  }

  console.log('[Skill Validator] All skills are valid.');
  process.exit(0);
}

main();
