/**
 * Session Wrap Skill — Direct implementation for ES6 compatibility
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function sessionWrap({ commitMessage, summary, docUpdates = [] }) {
  // Validate commit message format
  const validPrefixes = /^\[(claude|copilot|gemini|human)\]/;
  if (!validPrefixes.test(commitMessage)) {
    throw new Error('Invalid commit message format. Use: [tool] Subject or [tool] Phase X: Subject');
  }

  // Step 1: Update documentation
  const docResults = [];
  for (const { path: filePath, content } of docUpdates) {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.writeFile(absolutePath, content, 'utf8');
      docResults.push({
        path: filePath,
        status: 'updated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      docResults.push({
        path: filePath,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Step 2: Stage changes
  const stagedFiles = [];
  try {
    const output = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    stagedFiles.push(...output
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.slice(3).trim())
    );

    if (stagedFiles.length > 0) {
      execSync('git add -A', { cwd: process.cwd() });
    }
  } catch (error) {
    throw new Error(`Failed to stage changes: ${error.message}`);
  }

  // Step 3: Commit changes
  let commitHash = 'none';
  let commitTimestamp = new Date().toISOString();

  if (stagedFiles.length > 0) {
    try {
      const output = execSync(`git commit -m "${commitMessage}"`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });
      const hashMatch = output.match(/\[[\w\s]+\s([a-f0-9]{7})\]/);
      commitHash = hashMatch ? hashMatch[1] : 'unknown';
    } catch (error) {
      if (!error.message.includes('nothing to commit')) {
        throw new Error(`Failed to commit: ${error.message}`);
      }
    }
  }

  // Step 4: Generate report
  const docsSuccessful = docResults.filter(r => r.status === 'updated').length;
  const docsFailed = docResults.filter(r => r.status === 'failed').length;

  const report = {
    timestamp: commitTimestamp,
    sessionWrap: {
      userSummary: summary,
      documentation: {
        updated: docsSuccessful,
        failed: docsFailed,
        details: docResults
      },
      git: {
        stagedFiles,
        filesCount: stagedFiles.length,
        committed: commitHash !== 'none' && commitHash !== 'unknown',
        commitHash,
        commitMessage
      }
    },
    nextSteps: [
      commitHash === 'none' ? 'Review uncommitted changes and run session-wrap again' : `Verify commit ${commitHash} on current branch`,
      docsFailed > 0 ? `Fix ${docsFailed} failed documentation update(s) and retry` : null,
      'Push changes to remote if desired',
      'Update HANDOFF.md for next session continuity',
      'Run tests to verify no regressions'
    ].filter(Boolean),
    checklistItems: [
      {
        task: 'Documentation updated',
        completed: docsFailed === 0,
        detail: `${docsSuccessful} file(s) updated`
      },
      {
        task: 'Changes staged',
        completed: stagedFiles.length > 0,
        detail: `${stagedFiles.length} file(s) staged`
      },
      {
        task: 'Changes committed',
        completed: commitHash !== 'none' && commitHash !== 'unknown',
        detail: `Commit: ${commitHash}`
      }
    ]
  };

  return {
    success: true,
    commitHash,
    docUpdates: docResults,
    stagedFiles,
    report
  };
}
