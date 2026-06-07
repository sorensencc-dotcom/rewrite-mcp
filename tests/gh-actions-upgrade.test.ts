import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const FIXTURE = path.join(__dirname, "fixtures", "repo-upgrade");
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/gh-actions-upgrade.js");

function run(cmd: string, cwd: string) {
  const nodeModulesPath = path.resolve(__dirname, "../node_modules");
  const stdout = execSync(cmd, {
    cwd,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_PATH: nodeModulesPath,
    },
  });
  console.log("EXEC OUTPUT:", stdout.toString());
}

function cleanup() {
  if (fs.existsSync(FIXTURE)) {
    fs.rmSync(FIXTURE, { recursive: true, force: true });
  }
}

describe("gh-actions:upgrade", () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(path.join(FIXTURE, ".github", "workflows"), {
      recursive: true,
    });
  });

  afterEach(() => cleanup());

  it("upgrades setup-node@v4 to v5", () => {
    fs.writeFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Test
        run: npm test
`,
      "utf8"
    );

    run(`node "${SCRIPT_PATH}"`, FIXTURE);

    const updated = fs.readFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      "utf8"
    );

    expect(updated).toContain("actions/setup-node@v5");
    expect(updated).toContain("node-version: 24");
  });

  it("injects FORCE_JAVASCRIPT_ACTIONS_TO_NODE24 env var", () => {
    fs.writeFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
      "utf8"
    );

    run(`node "${SCRIPT_PATH}"`, FIXTURE);

    const updated = fs.readFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      "utf8"
    );

    expect(updated).toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true");
  });

  it("upgrades multiple deprecated actions in one file", () => {
    fs.writeFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      `
name: CI
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/upload-artifact@v4
`,
      "utf8"
    );

    run(`node "${SCRIPT_PATH}"`, FIXTURE);

    const updated = fs.readFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      "utf8"
    );

    expect(updated).toContain("actions/checkout@v5");
    expect(updated).toContain("actions/setup-node@v5");
    expect(updated).toContain("actions/upload-artifact@v5");
  });

  it("skips already-upgraded workflows", () => {
    fs.writeFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      `
name: CI
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
jobs:
  build:
    steps:
      - uses: actions/checkout@v5
`,
      "utf8"
    );

    const before = fs.readFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      "utf8"
    );

    run(`node "${SCRIPT_PATH}"`, FIXTURE);

    const after = fs.readFileSync(
      path.join(FIXTURE, ".github/workflows/ci.yml"),
      "utf8"
    );

    expect(before).toBe(after);
  });
});
