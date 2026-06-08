/**
 * File: RepositoryIngestion.test.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 */

import { join } from "path";
import { RepositoryIngestion } from "./RepositoryIngestion";

const SMALL_REPO = join(__dirname, "..", "fixtures", "repo-small");
const MEDIUM_REPO = join(__dirname, "..", "fixtures", "repo-medium");
const LARGE_REPO = join(__dirname, "..", "fixtures", "repo-large");

describe("RepositoryIngestion", () => {
  const ingestion = new RepositoryIngestion("repomix");

  jest.setTimeout(120_000);

  test("ingests small repo and detects framework", async () => {
    const res = await ingestion.ingestRepository(SMALL_REPO);

    expect(res.repomix.totalTokens).toBeGreaterThan(0);
    expect(res.dependencies.framework).toBeDefined();
    expect(res.tokenBudget.totalTokens).toBe(res.repomix.totalTokens);
  });

  test("ingests medium repo with deterministic token budget", async () => {
    const res1 = await ingestion.ingestRepository(MEDIUM_REPO);
    const res2 = await ingestion.ingestRepository(MEDIUM_REPO);

    expect(res1.repomix.totalTokens).toBe(res2.repomix.totalTokens);
    expect(res1.tokenBudget).toEqual(res2.tokenBudget);
  });

  test("ingests large repo and allocates tokens across phases", async () => {
    const res = await ingestion.ingestRepository(LARGE_REPO);

    const { analysis, redesign, validation, totalTokens } = res.tokenBudget;
    expect(analysis + redesign + validation).toBe(totalTokens);
    expect(analysis).toBeGreaterThan(0);
    expect(redesign).toBeGreaterThan(0);
    expect(validation).toBeGreaterThan(0);
  });

  test("fails fast on secrets", async () => {
    const SECRET_REPO = join(__dirname, "..", "fixtures", "repo-with-secrets");

    await expect(ingestion.ingestRepository(SECRET_REPO)).rejects.toThrow(
      /Secret detection failed/i
    );
  });
});
