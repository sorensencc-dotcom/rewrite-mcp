import { Probot, ProbotOctokit } from "probot";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateKeyPairSync } from "node:crypto";
import appBot from "./github-app-compliance-bot.js";

// Generate a valid RSA private key for Probot/jsonwebtoken signing
const { privateKey: DUMMY_PRIVATE_KEY } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
});

vi.mock("child_process", () => ({
  execSync: vi.fn((cmd, opts) => {
    console.log("EXEC COMMAND IN TEST:", cmd);
    // If it's cloning, we write a mock non-compliant yml file
    if (cmd.includes("git clone")) {
      const targetDir = cmd.split(" ").pop();
      const workflowsDir = path.join(targetDir, ".github", "workflows");
      console.log("Target Directory:", targetDir);
      console.log("Workflows Directory:", workflowsDir);
      fs.mkdirSync(workflowsDir, { recursive: true });
      const filePath = path.join(workflowsDir, "ci.yml");
      fs.writeFileSync(
        filePath,
        `name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: 20
`
      );
      console.log("Mock workflow written to:", filePath, "Exists:", fs.existsSync(filePath));
    }
    return Buffer.from("");
  })
}));

import nock from "nock";

nock.disableNetConnect();

describe("GitHub App Compliance Bot", () => {
  let probot: Probot;

  beforeEach(() => {
    probot = new Probot({
      appId: 123,
      privateKey: DUMMY_PRIVATE_KEY,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load the bot app logic
    probot.load(appBot);
  });

  afterEach(() => {
    vi.clearAllMocks();
    nock.cleanAll();
    const tempRepoPath = path.join("/tmp", "test-owner-test-repo");
    if (fs.existsSync(tempRepoPath)) {
      fs.rmSync(tempRepoPath, { recursive: true, force: true });
    }
  });

  it("handles schedule.repository and creates an auto-fix PR", async () => {
    // Mock access token request
    nock("https://api.github.com")
      .post("/app/installations/12345/access_tokens")
      .reply(200, {
        token: "mock-token",
        expires_at: "2026-06-03T21:00:00Z"
      });

    // Mock pull request creation request
    let prPayload: any;
    const prNock = nock("https://api.github.com")
      .post("/repos/test-owner/test-repo/pulls", (body) => {
        prPayload = body;
        return true;
      })
      .reply(201, {
        number: 42
      });

    await probot.receive({
      name: "schedule.repository",
      id: "1",
      payload: {
        installation: { id: 12345 },
        repository: {
          name: "test-repo",
          owner: {
            login: "test-owner"
          },
          full_name: "test-owner/test-repo"
        }
      }
    } as any);

    expect(prNock.isDone()).toBe(true);
    expect(prPayload).toBeDefined();
    expect(prPayload.title).toBe("chore: upgrade GitHub Actions to Node 24");
    expect(prPayload.head).toContain("chore/gh-actions-node24-");
    expect(prPayload.base).toBe("main");
    expect(prPayload.body).toContain("Upgraded actions from @v4 to @v5");
    expect(prPayload.body).toContain("node-version from 20 to 24");
    expect(prPayload.body).toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24");
  });

  it("handles workflow_run completed and creates an auto-fix PR", async () => {
    // Mock access token request
    nock("https://api.github.com")
      .post("/app/installations/12345/access_tokens")
      .reply(200, {
        token: "mock-token",
        expires_at: "2026-06-03T21:00:00Z"
      });

    // Mock pull request creation request
    let prPayload: any;
    const prNock = nock("https://api.github.com")
      .post("/repos/test-owner/test-repo/pulls", (body) => {
        prPayload = body;
        return true;
      })
      .reply(201, {
        number: 43
      });

    await probot.receive({
      name: "workflow_run",
      id: "2",
      payload: {
        action: "completed",
        installation: { id: 12345 },
        workflow: {
          name: "GitHub Actions Compliance Auto-PR"
        },
        repository: {
          name: "test-repo",
          owner: {
            login: "test-owner"
          },
          full_name: "test-owner/test-repo"
        }
      }
    } as any);

    expect(prNock.isDone()).toBe(true);
    expect(prPayload).toBeDefined();
  });
});
