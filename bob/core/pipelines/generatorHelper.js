// File: bob/core/pipelines/generatorHelper.js | Date: 2026-05-31 | v1.0.0

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Renders a template file by substituting data variables mapped to {{key}} patterns.
 * 
 * @param {string} templatePath - Absolute path to the .tpl template.
 * @param {Object} data - Key value mapping for substitutions.
 * @returns {Promise<string>} The rendered content.
 */
export async function renderTemplate(templatePath, data = {}) {
  try {
    let content = await fs.readFile(templatePath, 'utf8');
    for (const [key, val] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content = content.replace(regex, typeof val === 'object' ? JSON.stringify(val, null, 2) : val);
    }
    return content;
  } catch (error) {
    console.error(`[BOB Generator] Template render failed for ${templatePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Merges custom human-authored blocks from an existing file into the newly generated file.
 * Preserves text encapsulated between '// BEGIN CUSTOM [NAME]' and '// END CUSTOM [NAME]' fences.
 * Supports JSON formatting as well (using '/* BEGIN CUSTOM' comments).
 * 
 * @param {string} oldContent - The current operational file contents (human edits present).
 * @param {string} newContent - The newly generated scaffold.
 * @returns {string} The merged content containing preserved custom blocks.
 */
export function mergeCustomBlocks(oldContent = '', newContent = '') {
  if (!oldContent) return newContent;

  let merged = newContent;

  // JS/TS block matcher: // BEGIN CUSTOM [NAME] ... // END CUSTOM [NAME]
  const jsRegex = /\/\/ BEGIN CUSTOM ([A-Z_0-9]+)[\r\n]+([\s\S]*?)\/\/ END CUSTOM \1/g;
  let match;

  while ((match = jsRegex.exec(oldContent)) !== null) {
    const blockName = match[1];
    const blockBody = match[2];
    
    // Find matching block in the newly generated scaffold and substitute body
    const targetRegex = new RegExp(`(// BEGIN CUSTOM ${blockName}[\\r\\n]+)([\\s\\S]*?)(// END CUSTOM ${blockName})`, 'g');
    merged = merged.replace(targetRegex, `$1${blockBody}$3`);
  }

  // JSON/CSS multi-line comment block matcher: /* BEGIN CUSTOM [NAME] */ ... /* END CUSTOM [NAME] */
  const commentRegex = /\/\* BEGIN CUSTOM ([A-Z_0-9]+) \*\/[\r\n]+([\s\S]*?)\/\* END CUSTOM \1 \*\//g;
  while ((match = commentRegex.exec(oldContent)) !== null) {
    const blockName = match[1];
    const blockBody = match[2];
    
    const targetRegex = new RegExp(`(/\\* BEGIN CUSTOM ${blockName} \\*/[\\r\\n]+)([\\s\\S]*?)(/\\* END CUSTOM ${blockName} \\*/)`, 'g');
    merged = merged.replace(targetRegex, `$1${blockBody}$3`);
  }

  return merged;
}

/**
 * Writes newly generated contents to file, merging any existing human code blocks.
 * 
 * @param {string} filePath - Target file destination.
 * @param {string} newContent - Raw generated scaffold content.
 * @returns {Promise<boolean>} Success indicator.
 */
export async function writeFileSafely(filePath, newContent) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let existingContent = '';
    try {
      existingContent = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      // File does not exist yet; normal write
    }

    const mergedContent = mergeCustomBlocks(existingContent, newContent);
    await fs.writeFile(filePath, mergedContent, 'utf8');
    return true;
  } catch (error) {
    console.error(`[BOB Generator] Safe file write failed for ${filePath}: ${error.message}`);
    return false;
  }
}

export default {
  renderTemplate,
  mergeCustomBlocks,
  writeFileSafely
};
