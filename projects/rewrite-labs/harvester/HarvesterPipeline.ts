/**
 * File: HarvesterPipeline.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 *
 * Pipeline orchestration for website and repository ingestion.
 * Supports both website crawl and repo structure analysis.
 */

import { WebsiteIngestion } from "./website/WebsiteIngestion";
import { RepositoryIngestion } from "./repository/RepositoryIngestion";

export interface HarvesterResult {
  type: "website" | "repository";
  data: any;
}

export class HarvesterPipeline {
  private websiteIngestion = new WebsiteIngestion();
  private repositoryIngestion = new RepositoryIngestion("repomix");

  async run(target: string): Promise<HarvesterResult> {
    if (this.isWebsite(target)) {
      const websiteResult = await this.websiteIngestion.ingestWebsite(target);
      return {
        type: "website",
        data: websiteResult,
      };
    }

    if (this.isRepository(target)) {
      const repoResult = await this.repositoryIngestion.ingestRepository(target);

      return {
        type: "repository",
        data: {
          repomix: repoResult.repomix,
          dependencies: repoResult.dependencies,
          tokenBudget: repoResult.tokenBudget,
        },
      };
    }

    throw new Error(`Unsupported target type: ${target}`);
  }

  private isWebsite(target: string): boolean {
    return /^https?:\/\//.test(target);
  }

  private isRepository(target: string): boolean {
    // Local path or owner/repo pattern
    if (target.startsWith("/") || target.startsWith(".")) return true;
    if (target.includes("/") && !target.startsWith("http")) return true;
    return false;
  }
}
