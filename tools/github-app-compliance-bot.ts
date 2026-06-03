import { Probot } from "probot";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface RepoConfig {
  name: string;
  path: string;
}

interface ComplianceIssue {
  file: string;
  issues: string[];
}

async function checkRepoCompliance(repoPath: string): Promise<ComplianceIssue[]> {
  try {
    const workflowsDir = path.join(repoPath, ".github", "workflows");
    if (!fs.existsSync(workflowsDir)) {
      return [];
    }

    const issues: ComplianceIssue[] = [];
    const files = fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));

    for (const file of files) {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf-8");
      const fileIssues: string[] = [];

      // Check for node-version 20
      if (content.match(/node-version:\s*['"]?20['"]?/)) {
        fileIssues.push("node-version: 20");
      }

      // Check for @v4 actions
      if (content.match(/@v4\b/)) {
        fileIssues.push("@v4 action found");
      }

      // Check for missing FORCE_JAVASCRIPT_ACTIONS_TO_NODE24
      if (!content.includes("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24")) {
        fileIssues.push("missing FORCE_JAVASCRIPT_ACTIONS_TO_NODE24");
      }

      if (fileIssues.length > 0) {
        issues.push({ file, issues: fileIssues });
      }
    }

    return issues;
  } catch (error) {
    console.error(
      `Error checking compliance for ${repoPath}:`,
      error
    );
    return [];
  }
}

async function fixRepoCompliance(repoPath: string): Promise<string[]> {
  const updatedFiles: string[] = [];
  const workflowsDir = path.join(repoPath, ".github", "workflows");

  if (!fs.existsSync(workflowsDir)) {
    return [];
  }

  const files = fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));

  for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    let content = fs.readFileSync(filePath, "utf-8");
    let changed = false;

    // Replace node-version 20 with 24
    if (content.match(/node-version:\s*['"]?20['"]?/)) {
      content = content.replace(/node-version:\s*['"]?20['"]?/g, "node-version: 24");
      changed = true;
    }

    // Replace @v4 with @v5
    if (content.includes("@v4")) {
      content = content.replace(/(@(actions|)\/[\w-]+)@v4\b/g, "$1@v5");
      changed = true;
    }

    // Inject FORCE_JAVASCRIPT_ACTIONS_TO_NODE24 if missing
    if (!content.includes("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24")) {
      // Find the env section or create one
      if (content.includes("env:")) {
        content = content.replace(
          /^(env:)/m,
          "env:\n  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true"
        );
      } else {
        // Add env section after "on:" section
        content = content.replace(
          /^(on:\s*[\s\S]*?)(^jobs:)/m,
          `$1env:\n  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true\n\n$2`
        );
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      updatedFiles.push(filePath);
    }
  }

  return updatedFiles;
}

export default function (app: Probot) {
  // Listen for schedule events (e.g., daily or weekly)
  app.on("schedule.repository", async (context) => {
    const { owner, repo } = context.payload.repository;
    const repoFullName = `${owner}/${repo}`;

    console.log(`[${repoFullName}] Checking compliance...`);

    try {
      // Clone/checkout the repo
      const repoPath = await checkoutRepo(owner, repo, context);

      // Check compliance
      const issues = await checkRepoCompliance(repoPath);

      if (issues.length === 0) {
        console.log(`[${repoFullName}] ✅ Already compliant`);
        return;
      }

      console.log(
        `[${repoFullName}] ⚠️ Found ${issues.length} issue(s), opening PR...`
      );

      // Fix the repo
      const updatedFiles = await fixRepoCompliance(repoPath);

      if (updatedFiles.length === 0) {
        console.log(`[${repoFullName}] No changes needed`);
        return;
      }

      // Create branch and commit
      const branchName = `chore/gh-actions-node24-${Date.now()}`;
      execSync(`git checkout -b ${branchName}`, { cwd: repoPath });
      execSync(`git add .github/workflows/`, { cwd: repoPath });
      execSync(
        `git -c user.name="GitHub Actions Bot" -c user.email="bot@github.com" commit -m "chore: upgrade GitHub Actions to Node 24"`,
        { cwd: repoPath }
      );

      // Push branch
      execSync(`git push origin ${branchName}`, { cwd: repoPath });

      // Create pull request via GitHub API
      const prResponse = await context.octokit.rest.pulls.create({
        owner,
        repo,
        title: "chore: upgrade GitHub Actions to Node 24",
        head: branchName,
        base: "main",
        body: buildPRBody(issues, updatedFiles),
      });

      console.log(`[${repoFullName}] ✅ PR #${prResponse.data.number} created`);
    } catch (error) {
      console.error(`[${repoFullName}] Error:`, error);
    }
  });

  // Manual trigger via GitHub Actions workflow
  app.on("workflow_run", async (context) => {
    if (context.payload.action !== "completed") {
      return;
    }

    if (
      context.payload.workflow.name !==
      "GitHub Actions Compliance Auto-PR"
    ) {
      return;
    }

    const { owner, repo } = context.payload.repository;
    const repoFullName = `${owner}/${repo}`;

    console.log(`[${repoFullName}] Manual trigger, checking for non-compliance...`);

    try {
      const repoPath = await checkoutRepo(owner, repo, context);
      const issues = await checkRepoCompliance(repoPath);

      if (issues.length === 0) {
        console.log(`[${repoFullName}] ✅ Already compliant`);
        return;
      }

      const updatedFiles = await fixRepoCompliance(repoPath);

      if (updatedFiles.length > 0) {
        const branchName = `chore/gh-actions-node24-${Date.now()}`;
        execSync(`git checkout -b ${branchName}`, { cwd: repoPath });
        execSync(`git add .github/workflows/`, { cwd: repoPath });
        execSync(
          `git -c user.name="GitHub Actions Bot" -c user.email="bot@github.com" commit -m "chore: upgrade GitHub Actions to Node 24"`,
          { cwd: repoPath }
        );
        execSync(`git push origin ${branchName}`, { cwd: repoPath });

        const prResponse = await context.octokit.rest.pulls.create({
          owner,
          repo,
          title: "chore: upgrade GitHub Actions to Node 24",
          head: branchName,
          base: "main",
          body: buildPRBody(issues, updatedFiles),
        });

        console.log(
          `[${repoFullName}] ✅ PR #${prResponse.data.number} created`
        );
      }
    } catch (error) {
      console.error(`[${repoFullName}] Error:`, error);
    }
  });
}

async function checkoutRepo(
  owner: string,
  repo: string,
  context: any
): Promise<string> {
  const repoPath = path.join("/tmp", `${owner}-${repo}`);

  if (fs.existsSync(repoPath)) {
    execSync(`rm -rf ${repoPath}`);
  }

  execSync(
    `git clone https://x-access-token:${context.octokit.rest.repos.config.auth}@github.com/${owner}/${repo}.git ${repoPath}`
  );

  return repoPath;
}

function buildPRBody(
  issues: ComplianceIssue[],
  updatedFiles: string[]
): string {
  return `## GitHub Actions Node.js 24 Upgrade

This PR automatically upgrades your GitHub Actions workflows to be compatible with Node.js 24.

### Changes Made

${updatedFiles.map((f) => `- ✅ Updated \`${f}\``).join("\n")}

### Issues Fixed

${issues
  .map(
    (issue) =>
      `- **${issue.file}**\n${issue.issues.map((i) => `  - ${i}`).join("\n")}`
  )
  .join("\n")}

### What's Changed

- Upgraded actions from @v4 to @v5 (Node.js 24 compatible)
- Updated node-version from 20 to 24
- Added \`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24\` environment variable

### Deadline

GitHub Actions stops supporting Node.js 20 on **September 16, 2026**.

### Review & Merge

Please review this PR and merge if the changes look correct. All tests should pass with the upgraded actions.

---

*Automated by GitHub Actions Compliance Bot*`;
}
