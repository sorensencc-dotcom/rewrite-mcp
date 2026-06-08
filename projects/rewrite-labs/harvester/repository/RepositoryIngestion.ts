/**
 * File: RepositoryIngestion.ts
 * Date: 2026-06-08
 * Semver: 0.1.0
 *
 * Core module for deterministic repository ingestion via Repomix.
 * Integrates with Harvester Discovery phase, CodeBurn telemetry, TokenEconomyAgent.
 */

import { execSync, spawn } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { v4 as uuid } from "uuid";

export interface RepomixFile {
  path: string;
  language: string;
  tokens: number;
  content: string;
}

export interface RepomixOutput {
  files: RepomixFile[];
  totalTokens: number;
  repoId: string;
}

export interface DependencyInfo {
  framework: string;
  language: string;
  topDependencies: string[];
  buildSystem: string;
}

export interface TokenBudget {
  analysis: number;
  redesign: number;
  validation: number;
  totalTokens: number;
}

export interface IngestionResult {
  repomix: RepomixOutput;
  dependencies: DependencyInfo;
  tokenBudget: TokenBudget;
}

export class SecretDetectedError extends Error {
  constructor(public affectedFiles: string[]) {
    super(`Secret detected in ${affectedFiles.length} file(s)`);
    this.name = "SecretDetectedError";
  }
}

const FRAMEWORK_DETECTION: Record<string, string[]> = {
  react: ["package.json", "src/App.tsx", "src/App.jsx", "tsconfig.json"],
  vue: ["vue.config.js", "src/App.vue", "vite.config.ts"],
  svelte: ["svelte.config.js", "src/App.svelte"],
  next: ["next.config.js", "pages/", "app/"],
  nuxt: ["nuxt.config.ts", "pages/", "app.vue"],
  django: ["manage.py", "settings.py", "requirements.txt"],
  rails: ["Gemfile", "config/database.yml", "app/models/"],
  laravel: ["artisan", "composer.json", "config/app.php"],
  express: ["app.js", "server.js", "package.json"],
};

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /aws_/i,
  /gcp_/i,
  /private[_-]?key/i,
];

export class RepositoryIngestion {
  private repomixCmd: string;

  constructor(repomixCommand: string = "repomix") {
    this.repomixCmd = repomixCommand;
  }

  async ingestRepository(source: string): Promise<IngestionResult> {
    const repoId = this.normalizeRepoId(source);
    const tmpDir = join(process.cwd(), ".tmp-repomix", repoId);
    mkdirSync(tmpDir, { recursive: true });

    const outputPath = join(tmpDir, "repomix.json");

    try {
      const repomixOutput = await this.runRepomix(source, outputPath);
      this.validateSecrets(repomixOutput);

      const dependencies = this.extractDependencyTree(repomixOutput);
      const tokenBudget = this.calculateTokenBudget(repomixOutput.totalTokens);

      return {
        repomix: repomixOutput,
        dependencies,
        tokenBudget,
      };
    } catch (err) {
      if (err instanceof SecretDetectedError) {
        throw err;
      }
      throw new Error(`Repository ingestion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private normalizeRepoId(source: string): string {
    if (source.startsWith("https://github.com/")) {
      return source.replace("https://github.com/", "").replace(/\//g, "-").replace(".git", "");
    }
    return source.replace(/[\/\\]/g, "-").substring(0, 50);
  }

  private async runRepomix(source: string, outputPath: string): Promise<RepomixOutput> {
    return new Promise((resolve, reject) => {
      const args = [
        "--style", "json",
        "--token-count-tree",
        "--output", outputPath,
      ];

      if (source.startsWith("http")) {
        args.push("--remote");
      }

      const proc = spawn(this.repomixCmd, [...args, source], {
        shell: true,
        stdio: "pipe",
      });

      let stderr = "";

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Repomix failed: ${stderr || `exit code ${code}`}`));
          return;
        }

        try {
          const content = readFileSync(outputPath, "utf-8");
          const data = JSON.parse(content);
          resolve({
            files: data.files || [],
            totalTokens: data.totalTokens || 0,
            repoId: this.normalizeRepoId(source),
          });
        } catch (err) {
          reject(new Error(`Failed to parse Repomix output: ${err instanceof Error ? err.message : String(err)}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Repomix spawn error: ${err.message}`));
      });
    });
  }

  private validateSecrets(output: RepomixOutput): void {
    const affectedFiles: string[] = [];

    for (const file of output.files) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(file.content)) {
          affectedFiles.push(file.path);
          break;
        }
      }
    }

    if (affectedFiles.length > 0) {
      throw new SecretDetectedError(affectedFiles);
    }
  }

  private extractDependencyTree(output: RepomixOutput): DependencyInfo {
    const filePaths = output.files.map((f) => f.path).join("\n");

    let framework = this.detectFramework(filePaths);
    let language = this.detectLanguage(output);
    let buildSystem = this.detectBuildSystem(output);

    const pkgFile = output.files.find((f) => f.path.endsWith("package.json"));
    let topDependencies: string[] = [];

    if (pkgFile) {
      try {
        const pkg = JSON.parse(pkgFile.content);
        topDependencies = Object.keys(pkg.dependencies || {}).slice(0, 10);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      framework,
      language,
      topDependencies,
      buildSystem,
    };
  }

  private detectFramework(filePaths: string): string {
    for (const [framework, markers] of Object.entries(FRAMEWORK_DETECTION)) {
      if (markers.some((m) => filePaths.includes(m))) {
        return framework;
      }
    }
    return "unknown";
  }

  private detectLanguage(output: RepomixOutput): string {
    const languages = new Map<string, number>();

    for (const file of output.files) {
      const lang = file.language || "unknown";
      languages.set(lang, (languages.get(lang) || 0) + 1);
    }

    let maxLang = "unknown";
    let maxCount = 0;

    for (const [lang, count] of languages) {
      if (count > maxCount) {
        maxCount = count;
        maxLang = lang;
      }
    }

    return maxLang;
  }

  private detectBuildSystem(output: RepomixOutput): string {
    const filePaths = output.files.map((f) => f.path).join("\n");

    if (filePaths.includes("Makefile")) return "make";
    if (filePaths.includes("CMakeLists.txt")) return "cmake";
    if (filePaths.includes("gradle")) return "gradle";
    if (filePaths.includes("maven")) return "maven";
    if (filePaths.includes("setup.py")) return "setuptools";
    if (filePaths.includes("pyproject.toml")) return "poetry";

    return "unknown";
  }

  private calculateTokenBudget(totalTokens: number): TokenBudget {
    const analysis = Math.floor(totalTokens * 0.3);
    const redesign = Math.floor(totalTokens * 0.5);
    const validation = Math.floor(totalTokens * 0.2);

    return {
      analysis,
      redesign,
      validation,
      totalTokens,
    };
  }
}
