/**
 * Session Wrap Skill (Phase 47.1)
 * Wrap up session: update docs, commit changes, provide summary and next steps
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SessionWrapSkill {
  constructor() {
    this.name = 'session-wrap';
    this.version = '1.0.0';
  }

  /**
   * Main execution handler
   */
  async execute(payload) {
    const { docUpdates = [], commitMessage, summary } = payload;

    try {
      // Step 1: Update documentation
      const docResults = await this.updateDocs(docUpdates);

      // Step 2: Stage changes
      const stagedFiles = await this.stageChanges();

      // Step 3: Commit changes
      const commitHash = await this.commitChanges(commitMessage);

      // Step 4: Generate summary and next steps
      const report = await this.generateReport(
        summary,
        docResults,
        stagedFiles,
        commitHash
      );

      return {
        success: true,
        commitHash,
        docUpdates: docResults,
        stagedFiles,
        report
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Update documentation files
   */
  async updateDocs(docUpdates) {
    const results = [];

    for (const { path: filePath, content } of docUpdates) {
      try {
        const absolutePath = path.resolve(filePath);
        await fs.writeFile(absolutePath, content, 'utf8');
        results.push({
          path: filePath,
          status: 'updated',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          path: filePath,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Stage changed files
   */
  async stageChanges() {
    try {
      const output = execSync('git status --porcelain', {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      const changedFiles = output
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.slice(3).trim());

      if (changedFiles.length === 0) {
        return { files: [], message: 'No changes to stage' };
      }

      // Stage all changes
      execSync('git add -A', { cwd: process.cwd() });

      return {
        files: changedFiles,
        message: `Staged ${changedFiles.length} file(s)`
      };
    } catch (error) {
      throw new Error(`Failed to stage changes: ${error.message}`);
    }
  }

  /**
   * Commit changes
   */
  async commitChanges(commitMessage) {
    try {
      // Verify commit message format
      if (!this.validateCommitMessage(commitMessage)) {
        throw new Error(
          'Invalid commit message format. Use: [tool] Subject or [tool] Phase X: Subject'
        );
      }

      // Execute commit
      const output = execSync(`git commit -m "${commitMessage}"`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      // Extract commit hash
      const hashMatch = output.match(/\[[\w\s]+\s([a-f0-9]{7})\]/);
      const hash = hashMatch ? hashMatch[1] : 'unknown';

      return {
        hash,
        message: commitMessage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        return {
          hash: 'none',
          message: 'Nothing to commit',
          timestamp: new Date().toISOString()
        };
      }
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * Validate commit message format
   */
  validateCommitMessage(msg) {
    // Must start with [tool] prefix
    const validPrefixes = /^\[(claude|copilot|gemini|human)\]/;
    return validPrefixes.test(msg);
  }

  /**
   * Generate session wrap report
   */
  async generateReport(userSummary, docResults, stagedFiles, commitHash) {
    const now = new Date().toISOString();

    // Count successes
    const docsSuccessful = docResults.filter(r => r.status === 'updated').length;
    const docsFailed = docResults.filter(r => r.status === 'failed').length;

    // Build report
    const report = {
      timestamp: now,
      sessionWrap: {
        userSummary,
        documentation: {
          updated: docsSuccessful,
          failed: docsFailed,
          details: docResults
        },
        git: {
          stagedFiles: stagedFiles.files || [],
          filesCount: stagedFiles.files?.length || 0,
          committed: commitHash.hash !== 'none' && commitHash.hash !== 'unknown',
          commitHash: commitHash.hash,
          commitMessage: commitHash.message
        }
      },
      nextSteps: this.generateNextSteps(commitHash, docsSuccessful, docsFailed),
      checklistItems: [
        {
          task: 'Documentation updated',
          completed: docsFailed === 0,
          detail: `${docsSuccessful} file(s) updated`
        },
        {
          task: 'Changes staged',
          completed: stagedFiles.files && stagedFiles.files.length > 0,
          detail: `${stagedFiles.files?.length || 0} file(s) staged`
        },
        {
          task: 'Changes committed',
          completed: commitHash.hash !== 'none' && commitHash.hash !== 'unknown',
          detail: `Commit: ${commitHash.hash}`
        }
      ]
    };

    return report;
  }

  /**
   * Generate next steps based on session outcome
   */
  generateNextSteps(commitHash, docsSuccessful, docsFailed) {
    const steps = [];

    if (commitHash.hash === 'none' || commitHash.hash === 'unknown') {
      steps.push('Review uncommitted changes and run session-wrap again');
    } else {
      steps.push(`Verify commit ${commitHash.hash} on current branch`);
    }

    if (docsFailed > 0) {
      steps.push(`Fix ${docsFailed} failed documentation update(s) and retry`);
    }

    steps.push('Push changes to remote if desired');
    steps.push('Update HANDOFF.md for next session continuity');
    steps.push('Run tests to verify no regressions');

    return steps;
  }

  /**
   * Get skill metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: 'Wrap up session: update docs, commit changes, provide summary and next steps',
      inputs: ['docUpdates', 'commitMessage', 'summary'],
      outputs: ['commitHash', 'docUpdates', 'stagedFiles', 'report']
    };
  }
}

// Export skill
module.exports = new SessionWrapSkill();
