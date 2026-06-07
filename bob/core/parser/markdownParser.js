// File: bob/core/parser/markdownParser.js | Date: 2026-05-31 | v1.0.0

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

/**
 * Searches and parses all spec markdown files in the workspace into a structured AST.
 * 
 * @returns {Promise<Object>} Unified AST: { [filePath]: { frontmatter, sections } }
 */
export async function parseAllMarkdown() {
  try {
    // Search both docs/ and projects/ directories for markdown files
    const pattern = '{docs/**/*.md,projects/**/*.md}';
    const files = glob.sync(pattern, { cwd: ROOT_DIR, absolute: true });
    const ast = {};

    for (const file of files) {
      const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
      const content = await fs.readFile(file, 'utf8');
      ast[relPath] = parseMarkdown(content);
    }

    return ast;
  } catch (error) {
    console.error(`[BOB Parser] Parsing failed: ${error.message}`);
    return {};
  }
}

/**
 * Parses raw markdown content into structured frontmatter and sections.
 * 
 * @param {string} md - Raw markdown text.
 * @returns {Object} Structured model: { frontmatter, sections }
 */
export function parseMarkdown(md = '') {
  const sections = {};
  const frontmatter = {};
  const lines = md.split(/\r?\n/);
  
  let inFrontmatter = false;
  let frontmatterLines = [];
  let currentSection = 'Root';
  sections[currentSection] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // YAML frontmatter detection
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line.trim() === '---') {
        inFrontmatter = false;
        // Parse frontmatter keys
        for (const fLine of frontmatterLines) {
          const match = fLine.match(/^([^:]+):\s*(.*)/);
          if (match) {
            frontmatter[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
          }
        }
        continue;
      }
      frontmatterLines.push(line);
      continue;
    }

    // Heading extraction (## or #)
    const h2Match = line.match(/^##\s+(.*)/);
    const h1Match = line.match(/^#\s+(.*)/);

    if (h2Match) {
      currentSection = h2Match[1].trim();
      sections[currentSection] = [];
    } else if (h1Match && currentSection === 'Root') {
      currentSection = h1Match[1].trim();
      sections[currentSection] = [];
    } else {
      sections[currentSection].push(line);
    }
  }

  // Clean sections by filtering out trailing empty entries
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].join('\n').trim().split('\n');
    if (sections[key].length === 1 && sections[key][0] === '') {
      sections[key] = [];
    }
  }

  return {
    frontmatter,
    sections
  };
}

export default {
  parseAllMarkdown,
  parseMarkdown
};
