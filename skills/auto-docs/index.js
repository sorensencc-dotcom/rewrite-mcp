/**
 * Auto-Docs Skill — Auto-discover and update ALL relevant docs from changes
 *
 * Scans git diff → categorizes changes → determines affected docs → auto-generates content
 * Uses PowerShell permission bypass for zero-prompt batch writes
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function autoDocs() {
  const cwd = process.cwd();
  const results = {
    timestamp: new Date().toISOString(),
    changes: [],
    categories: [],
    docs: [],
    git: { staged: 0, committed: false, hash: null },
    report: null
  };

  try {
    // Step 1: Detect what changed
    const diff = getDiff(cwd);
    if (!diff.files.length) {
      return {
        success: true,
        message: 'No changes detected',
        changes: []
      };
    }

    results.changes = diff.files;

    // Step 2: Categorize changes
    const categories = categorizeChanges(diff.files);
    results.categories = categories;

    // Warn if no categories detected (all files are 'other' type)
    if (categories.length === 0) {
      console.warn('⚠️  No doc-relevant changes detected. File types:',
        diff.files.map(f => f.type).filter((t, i, arr) => arr.indexOf(t) === i).join(', '));
    }

    // Step 3: Map to doc files (pass changes for full capture)
    const docUpdates = await generateDocUpdates(categories, cwd, diff.files);
    results.docs = docUpdates;

    // Step 4: Write all doc updates (PowerShell bypass handles zero prompts)
    const writeResults = await writeDocUpdates(docUpdates, cwd);

    // Step 5: Stage only the docs that were modified
    const successfulDocs = writeResults
      .filter(r => r.status === 'updated')
      .map(r => r.path);
    const stagedFiles = await stageChanges(successfulDocs, cwd);
    results.git.staged = stagedFiles.length;

    // Step 6: Create commit
    const commitMessage = generateCommitMessage(categories);
    if (stagedFiles.length > 0) {
      const hash = await createCommit(commitMessage, cwd);
      results.git.committed = !!hash;
      results.git.hash = hash;
    }

    // Step 7: Generate report
    results.report = generateReport(results, writeResults);

    return {
      success: true,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: results.timestamp
    };
  }
}

function getDiff(cwd) {
  try {
    // Get last commit diff. On initial commit, this throws; catch and fall back to status
    const output = execSync('git diff HEAD~1..HEAD --name-status', {
      encoding: 'utf8',
      cwd
    });

    const files = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [status, ...parts] = line.split('\t');
        return {
          status,
          path: parts.join('\t'),
          type: getFileType(parts.join('\t'))
        };
      });

    return { files, raw: output };
  } catch (error) {
    // No prior commit or git error. Fall back to unstaged changes (git status)
    // Note: This misses deleted/renamed files in the last commit.
    const output = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd
    });

    const files = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const path = line.slice(3).trim();
        // Status codes: M=modified, A=added, D=deleted, R=renamed, C=copied, ??=untracked
        const statusCode = line[0];
        return {
          status: statusCode,
          path,
          type: getFileType(path)
        };
      });

    return { files, raw: output };
  }
}

function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  if (basename.includes('package.json')) return 'package';
  if (ext === '.ts' || ext === '.js') return 'code';
  if (ext === '.md') return 'doc';
  if (basename.includes('changelog')) return 'changelog';
  if (basename.includes('roadmap')) return 'roadmap';
  if (basename.includes('readme')) return 'readme';
  if (filePath.includes('schema') || ext === '.json') return 'schema';
  if (filePath.includes('test')) return 'test';
  if (filePath.includes('script')) return 'script';

  return 'other';
}

function categorizeChanges(files) {
  const categories = new Set();

  files.forEach(file => {
    if (file.type === 'code') categories.add('code');
    if (file.type === 'package') categories.add('dependencies');
    if (file.type === 'schema') categories.add('schema');
    if (file.type === 'script') categories.add('operations');
    // Case-insensitive phase detection
    if (file.path.toLowerCase().includes('phase')) categories.add('phase');
  });

  return Array.from(categories);
}

async function generateDocUpdates(categories, cwd, changes) {
  const updates = [];
  const timestamp = new Date().toISOString();

  // ALWAYS capture to CHANGELOG (create if missing)
  updates.push({
    docType: 'CHANGELOG',
    path: path.join(cwd, 'CHANGELOG.md'),
    reason: 'All changes captured',
    createIfMissing: true,
    content: generateChangelogEntry(changes, categories, timestamp)
  });

  // ALWAYS append to ROADMAP if it exists (for phase tracking)
  if (categories.includes('phase')) {
    updates.push({
      docType: 'ROADMAP',
      path: path.join(cwd, 'CIC_MASTER_ROADMAP.md'),
      reason: 'Phase progression',
      createIfMissing: false,
      content: generateRoadmapEntry(changes, categories, timestamp)
    });
  }

  // Capture to other docs if they exist
  if (categories.includes('schema')) {
    updates.push({
      docType: 'SCHEMA_DOCS',
      path: path.join(cwd, 'docs', 'SCHEMAS.md'),
      reason: 'Schema changes',
      createIfMissing: false
    });
  }

  // README: create if missing for operations/dependencies
  if (categories.includes('operations') || categories.includes('dependencies')) {
    updates.push({
      docType: 'README',
      path: path.join(cwd, 'README.md'),
      reason: 'Infrastructure/dependency changes',
      createIfMissing: true,
      content: `# Documentation\n\n${generateReadmeEntry(changes, timestamp)}\n`
    });
  }

  // Filter: always include createIfMissing:true; check existence for others
  const existing = [];
  for (const update of updates) {
    if (update.createIfMissing) {
      existing.push(update);
    } else {
      try {
        await fs.stat(update.path);
        existing.push(update);
      } catch {
        // Doc doesn't exist, skip
      }
    }
  }

  return existing;
}

function generateChangelogEntry(changes, categories, timestamp) {
  const files = changes.map(c => `  - ${c.path}`).join('\n');
  const entry = `## Changes (${timestamp})\n\n**Categories:** ${categories.join(', ') || 'other'}\n\n**Files:**\n${files}\n\n<!-- Updated by auto-docs skill -->`;
  return entry;
}

function generateRoadmapEntry(changes, categories, timestamp) {
  return `\n\n### Phase Update (${timestamp})\nDetected phase changes. See CHANGELOG for details.`;
}

function generateReadmeEntry(changes, timestamp) {
  return `Last updated: ${timestamp}\nSee CHANGELOG for recent changes.`;
}

async function writeDocUpdates(docUpdates, cwd) {
  const results = [];

  for (const doc of docUpdates) {
    try {
      const timestamp = new Date().toISOString();

      // Read existing content
      let content = '';
      let isNew = false;
      try {
        content = await fs.readFile(doc.path, 'utf8');
      } catch (readError) {
        if (readError.code !== 'ENOENT') {
          throw readError; // Permission denied or other error
        }
        // File doesn't exist
        isNew = true;
        if (doc.content) {
          // Use provided content (e.g., changelog entry)
          content = doc.content;
        } else {
          // Default structure
          content = `# ${doc.docType}\n`;
        }
      }

      // For existing files, append new content
      if (!isNew && doc.content) {
        // For CHANGELOG: prepend new entry to top
        if (doc.docType === 'CHANGELOG') {
          content = `${doc.content}\n\n${content}`;
        } else {
          // For others: append at end
          if (!content.endsWith('\n')) {
            content += '\n';
          }
          content += `\n${doc.content}`;
        }
      }

      // Ensure content ends with newline
      if (!content.endsWith('\n')) {
        content += '\n';
      }

      // Write via fs (permission bypass configured for PowerShell Set-Content)
      await fs.writeFile(doc.path, content, 'utf8');

      results.push({
        docType: doc.docType,
        path: doc.path,
        status: 'updated',
        reason: doc.reason,
        isNew
      });
    } catch (error) {
      results.push({
        docType: doc.docType,
        path: doc.path,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

async function stageChanges(docPaths, cwd) {
  try {
    // Stage only the doc files modified by auto-docs
    // Prevents staging unrelated user changes
    if (docPaths.length === 0) {
      return [];
    }

    for (const docPath of docPaths) {
      execSync(`git add "${docPath.replace(/"/g, '\\"')}"`, { cwd });
    }

    const output = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd
    });

    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.slice(3).trim());
  } catch (error) {
    throw new Error(`Failed to stage: ${error.message}`);
  }
}

async function createCommit(message, cwd) {
  try {
    // Escape quotes to prevent command injection
    const escapedMessage = message.replace(/"/g, '\\"').replace(/`/g, '\\`');
    const output = execSync(`git commit -m "${escapedMessage}"`, {
      encoding: 'utf8',
      cwd
    });

    // Match both normal branch format and detached HEAD format
    const match = output.match(/\[[\w\s\-/]+\s([a-f0-9]{7})\]/) ||
                  output.match(/^\(([a-f0-9]{7})\)/m);
    return match ? (match[1] || match[2]) : null;
  } catch (error) {
    // Check exit code 1 for "nothing to commit" (no staged changes)
    if (error.status === 1) {
      return null;
    }
    throw error;
  }
}

function generateCommitMessage(categories) {
  const parts = [];

  if (categories.includes('phase')) parts.push('Phase progression');
  if (categories.includes('code')) parts.push('Code changes');
  if (categories.includes('schema')) parts.push('Schema updates');
  if (categories.includes('dependencies')) parts.push('Dependencies');

  const subject = parts.length ? parts.join(' + ') : 'Auto-docs update';
  return `[claude] ${subject}`;
}

function generateReport(results, writeResults) {
  const successful = writeResults.filter(r => r.status === 'updated').length;
  const failed = writeResults.filter(r => r.status === 'failed').length;

  return {
    title: 'Auto-Docs Session Report',
    timestamp: results.timestamp,
    changes: {
      detected: results.changes.length,
      types: results.categories
    },
    documentation: {
      updated: successful,
      failed,
      details: writeResults
    },
    git: {
      staged: results.git.staged,
      committed: results.git.committed,
      hash: results.git.hash
    },
    nextSteps: [
      successful > 0 ? `Updated ${successful} documentation file(s)` : 'No docs updated',
      results.git.committed ? `Commit: ${results.git.hash}` : 'No changes to commit',
      failed > 0 ? `⚠️  ${failed} doc update(s) failed — review and retry` : '✅ All docs updated successfully',
      'Push to remote if desired'
    ]
  };
}
