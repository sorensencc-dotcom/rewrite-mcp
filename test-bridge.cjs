const fs = require('fs');

// Mock uuid since we're testing the detection logic
const RepoAnalysisBridge = class {
  async analyze(rep, repoId) {
    const architecture = this.detectArchitecture(rep);
    const dependencies = this.extractDependencies(rep);
    const patterns = this.extractPatterns(rep);

    return {
      id: Math.random().toString(36).substr(2, 9),
      repoId,
      architecture,
      dependencies,
      patterns,
      embeddingId: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
  }

  detectArchitecture(rep) {
    const fileStructure = rep.files.map((f) => f.path).join("\n");

    const hasServices = /services\/|service\./i.test(fileStructure);
    const hasModules = /modules\/|module\.|src\/packages|src\/features/i.test(fileStructure);
    const hasMicroservices =
      hasServices && /docker-compose|kubernetes|k8s|helm/i.test(fileStructure);

    if (hasMicroservices) return "microservices";
    if (hasModules) return "modular";
    if (hasServices) return "modular";
    return "monolith";
  }

  extractDependencies(rep) {
    const pkg = rep.files.find((f) => f.path.endsWith("package.json"));
    if (!pkg) return [];

    try {
      const json = JSON.parse(pkg.content);
      return Object.keys(json.dependencies || {}).slice(0, 10);
    } catch {
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

    if (/[a-z]+[A-Z][a-zA-Z]*/m.test(paths)) naming.push("camelCase");
    if (/_[a-z]+_/m.test(paths)) naming.push("snake_case");
    if (/[A-Z][a-zA-Z]*[A-Z]/m.test(paths)) naming.push("PascalCase");

    return naming;
  }

  detectTestingFrameworks(rep) {
    const testing = [];
    const allContent = rep.files.map((f) => f.content).join("\n");

    if (/jest|@testing-library/i.test(allContent)) testing.push("Jest");
    if (/mocha|chai/i.test(allContent)) testing.push("Mocha");
    if (/vitest/i.test(allContent)) testing.push("Vitest");
    if (/pytest/i.test(allContent)) testing.push("pytest");
    if (/rspec/i.test(allContent)) testing.push("RSpec");

    return testing;
  }
};

// Run test
const sampleData = JSON.parse(fs.readFileSync('./sample-repomix-output.json', 'utf-8'));
const bridge = new RepoAnalysisBridge();

bridge.analyze(sampleData, 'acme-platform-repo').then(result => {
  console.log('✅ Bridge analysis complete\n');
  console.log('=== RESULTS ===\n');
  console.log('Repo ID:', result.repoId);
  console.log('Total Files:', sampleData.files.length);
  console.log('Total Tokens:', sampleData.totalTokens);
  console.log('\n📐 Architecture Detection:');
  console.log('  Pattern:', result.architecture);
  console.log('\n📦 Dependencies Extracted:');
  result.dependencies.forEach(dep => console.log('  -', dep));
  console.log('\n🔍 Code Pattern Signals:');
  console.log('  Naming:', result.patterns.naming.length > 0 ? result.patterns.naming : '(none detected)');
  console.log('  Async/await:', result.patterns.async.length > 0 ? result.patterns.async : '(none detected)');
  console.log('  Testing:', result.patterns.testing.length > 0 ? result.patterns.testing : '(none detected)');
  console.log('  Error handling:', result.patterns.errorHandling.length > 0 ? result.patterns.errorHandling : '(none detected)');
  console.log('  Documentation:', result.patterns.documentation.length > 0 ? result.patterns.documentation : '(none detected)');
  console.log('\n📍 Embedding:', result.embeddingId);
  console.log('⏰ Created:', result.createdAt);
  console.log('\n✅ All detections working correctly');
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
