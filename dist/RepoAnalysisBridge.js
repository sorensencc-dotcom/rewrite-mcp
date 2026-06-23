"use strict";
/**
 * File: RepoAnalysisBridge.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 *
 * Converts Repomix JSON output into CIC-native data structures.
 * Enables external repository analysis and Knowledge Graph enrichment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoAnalysisBridge = void 0;
const uuid_1 = require("uuid");
class RepoAnalysisBridge {
    async analyze(rep, repoId) {
        const architecture = this.detectArchitecture(rep);
        const dependencies = this.extractDependencies(rep);
        const patterns = this.extractPatterns(rep);
        const embeddingId = await this.createEmbedding(rep, repoId);
        const node = {
            id: (0, uuid_1.v4)(),
            repoId,
            architecture,
            dependencies,
            patterns,
            embeddingId,
            createdAt: new Date().toISOString(),
        };
        await this.persistToKG(node);
        await this.linkSimilar(node);
        return node;
    }
    detectArchitecture(rep) {
        const fileStructure = rep.files.map((f) => f.path).join("\n");
        const hasServices = /services\/|service\./i.test(fileStructure);
        const hasModules = /modules\/|module\.|src\/packages|src\/features/i.test(fileStructure);
        const hasMicroservices = hasServices && /docker-compose|kubernetes|k8s|helm/i.test(fileStructure);
        if (hasMicroservices)
            return "microservices";
        if (hasModules)
            return "modular";
        if (hasServices)
            return "modular";
        return "monolith";
    }
    extractDependencies(rep) {
        const pkg = rep.files.find((f) => f.path.endsWith("package.json"));
        if (!pkg) {
            // Try Python
            const pyreq = rep.files.find((f) => f.path === "requirements.txt" || f.path.endsWith("pyproject.toml"));
            if (pyreq) {
                // Parse Python requirements
                const lines = pyreq.content.split("\n");
                return lines
                    .filter((l) => l.trim() && !l.startsWith("#"))
                    .map((l) => l.split("==")[0].split(">=")[0].trim())
                    .slice(0, 10);
            }
            return [];
        }
        try {
            const json = JSON.parse(pkg.content);
            return Object.keys(json.dependencies || {}).slice(0, 10);
        }
        catch {
            return [];
        }
    }
    extractPatterns(rep) {
        const allContent = rep.files.map((f) => f.content).join("\n");
        return {
            naming: this.detectNamingConventions(rep),
            async: /async\s+function|await\s+/m.test(allContent) ? ["async-await"] : [],
            testing: this.detectTestingFrameworks(rep),
            errorHandling: /try\s*{[\s\S]*?}\s*catch/m.test(allContent) ? ["try-catch"] : [],
            documentation: /\/\*\*|##\s+|###\s+|"""[^"]*"""/m.test(allContent)
                ? ["doc-comments"]
                : [],
        };
    }
    detectNamingConventions(rep) {
        const naming = [];
        const paths = rep.files.map((f) => f.path).join("\n");
        if (/[a-z]+[A-Z][a-zA-Z]*/m.test(paths))
            naming.push("camelCase");
        if (/_[a-z]+_/m.test(paths))
            naming.push("snake_case");
        if (/[A-Z][a-zA-Z]*[A-Z]/m.test(paths))
            naming.push("PascalCase");
        return naming;
    }
    detectTestingFrameworks(rep) {
        const testing = [];
        const allContent = rep.files.map((f) => f.content).join("\n");
        if (/jest|@testing-library/i.test(allContent))
            testing.push("Jest");
        if (/mocha|chai/i.test(allContent))
            testing.push("Mocha");
        if (/vitest/i.test(allContent))
            testing.push("Vitest");
        if (/pytest/i.test(allContent))
            testing.push("pytest");
        if (/rspec/i.test(allContent))
            testing.push("RSpec");
        return testing;
    }
    async createEmbedding(rep, repoId) {
        // Stub: call embedding service with summary of repo
        // In production, this would call a vector DB or embedding service.
        const summary = `Repo ${repoId} with ${rep.files.length} files and ${rep.totalTokens} tokens.`;
        void summary; // suppress unused warning
        return (0, uuid_1.v4)();
    }
    async persistToKG(node) {
        // Stub: write node into CIC KG store
        // In production, this would write to the Knowledge Graph database.
        void node; // suppress unused warning
        // await ckgClient.createNode({...})
    }
    async linkSimilar(node) {
        // Stub: compute cosine similarity and link nodes with score >= 0.7
        // In production, this would query similar repos and create edges.
        void node; // suppress unused warning
        // const similar = await ckgClient.findSimilar(node.embeddingId);
        // for (const repo of similar) {
        //   if (similarity >= 0.7) {
        //     await ckgClient.createEdge({...})
        //   }
        // }
    }
}
exports.RepoAnalysisBridge = RepoAnalysisBridge;
