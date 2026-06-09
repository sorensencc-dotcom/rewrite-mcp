const http = require('http');
const fs = require('fs');

const CODEBURN_ENDPOINT = process.env.CODEBURN_ENDPOINT || 'http://localhost:3000/metrics';
const OPERATOR_ID = process.env.OPERATOR_ID || 'docker-operator';
const PORT = 3001;

// Sample repos with different frameworks
const SAMPLE_REPOS = [
  { path: 'repo-react-1', framework: 'react', tokens: 45000, tenant: 'acme-corp' },
  { path: 'repo-react-2', framework: 'react', tokens: 52000, tenant: 'acme-corp' },
  { path: 'repo-django', framework: 'django', tokens: 38000, tenant: 'techflow' },
  { path: 'repo-rails', framework: 'rails', tokens: 41000, tenant: 'techflow' },
  { path: 'repo-vue', framework: 'vue', tokens: 35000, tenant: 'startup-xyz' },
];

const collectedMetrics = [];

// Emit telemetry event to CodeBurn
async function emitTelemetry(event) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event: 'HARVESTER_INGESTION',
      operatorId: OPERATOR_ID,
      timestamp: Date.now(),
      ...event,
    });

    const url = new URL(CODEBURN_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Simulate RepositoryIngestion with token budget calculation
function ingestRepository(repoConfig) {
  const totalTokens = repoConfig.tokens;
  const compressedTokens = Math.floor(totalTokens * 0.65); // ~35% compression

  return {
    repomix: {
      repoId: repoConfig.path,
      totalTokens,
      files: Math.floor(Math.random() * 50) + 10,
    },
    dependencies: {
      framework: repoConfig.framework,
      topDependencies: [`dep1-${repoConfig.framework}`, `dep2-${repoConfig.framework}`],
    },
    tokenBudget: {
      analysis: Math.floor(totalTokens * 0.3),
      redesign: Math.floor(totalTokens * 0.5),
      validation: Math.floor(totalTokens * 0.2),
      totalTokens,
    },
  };
}

// Simulate ingestion pipeline
async function runIngestionPipeline() {
  console.log('\n🚀 Phase 4.4 Day 4: Token Telemetry Pipeline');
  console.log('='.repeat(60));
  console.log(`📍 CodeBurn Endpoint: ${CODEBURN_ENDPOINT}`);
  console.log(`👤 Operator: ${OPERATOR_ID}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const repo of SAMPLE_REPOS) {
    try {
      console.log(`\n📦 Processing: ${repo.path}`);

      // Simulate ingestion
      const result = ingestRepository(repo);
      const reduction = ((1 - result.repomix.totalTokens / result.repomix.totalTokens) * 35).toFixed(1);

      // Emit telemetry
      await emitTelemetry({
        tenantId: repo.tenant,
        repoId: repo.path,
        framework: repo.framework,
        totalTokens: result.repomix.totalTokens,
        compressedTokens: result.repomix.totalTokens * 0.65,
        tokenReduction: reduction,
        files: result.repomix.files,
        status: 'success',
      });

      collectedMetrics.push({
        repoId: repo.path,
        tenant: repo.tenant,
        framework: repo.framework,
        tokens: result.repomix.totalTokens,
        compressed: result.repomix.totalTokens * 0.65,
      });

      successCount++;
      console.log(`   ✅ Telemetry emitted`);
      console.log(`   💾 Tokens: ${result.repomix.totalTokens} → ${Math.floor(result.repomix.totalTokens * 0.65)}`);
      console.log(`   📊 Budget: ${result.tokenBudget.analysis}/${result.tokenBudget.redesign}/${result.tokenBudget.validation}`);
    } catch (err) {
      failureCount++;
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Small delay between emissions
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 Pipeline Summary:`);
  console.log(`   Repos processed: ${successCount}/${SAMPLE_REPOS.length}`);
  console.log(`   Success rate: ${((successCount / SAMPLE_REPOS.length) * 100).toFixed(0)}%`);
  console.log(`   Failures: ${failureCount}`);

  // Calculate aggregates
  const totalTokens = collectedMetrics.reduce((sum, m) => sum + m.tokens, 0);
  const totalCompressed = collectedMetrics.reduce((sum, m) => sum + m.compressed, 0);
  const avgReduction = (((totalTokens - totalCompressed) / totalTokens) * 100).toFixed(1);

  console.log(`\n💾 Token Metrics:`);
  console.log(`   Total tokens: ${totalTokens}`);
  console.log(`   Compressed: ${Math.floor(totalCompressed)}`);
  console.log(`   Reduction: ${avgReduction}%`);

  // By tenant
  const byTenant = {};
  collectedMetrics.forEach((m) => {
    if (!byTenant[m.tenant]) byTenant[m.tenant] = [];
    byTenant[m.tenant].push(m);
  });

  console.log(`\n🏢 By Tenant:`);
  Object.entries(byTenant).forEach(([tenant, repos]) => {
    const tenantTokens = repos.reduce((sum, m) => sum + m.tokens, 0);
    const tenantCompressed = repos.reduce((sum, m) => sum + m.compressed, 0);
    console.log(`   ${tenant}: ${tenantTokens} tokens (${repos.length} repos)`);
  });

  // By framework
  const byFramework = {};
  collectedMetrics.forEach((m) => {
    if (!byFramework[m.framework]) byFramework[m.framework] = [];
    byFramework[m.framework].push(m);
  });

  console.log(`\n🔧 By Framework:`);
  Object.entries(byFramework).forEach(([framework, repos]) => {
    const fwTokens = repos.reduce((sum, m) => sum + m.tokens, 0);
    console.log(`   ${framework}: ${fwTokens} tokens (${repos.length} repos)`);
  });
}

// HTTP server for metrics dashboard
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/metrics' && req.method === 'GET') {
    const byTenant = {};
    const byFramework = {};

    collectedMetrics.forEach((m) => {
      if (!byTenant[m.tenant]) byTenant[m.tenant] = { repos: 0, tokens: 0, compressed: 0 };
      byTenant[m.tenant].repos++;
      byTenant[m.tenant].tokens += m.tokens;
      byTenant[m.tenant].compressed += m.compressed;

      if (!byFramework[m.framework]) byFramework[m.framework] = { repos: 0, tokens: 0, compressed: 0 };
      byFramework[m.framework].repos++;
      byFramework[m.framework].tokens += m.tokens;
      byFramework[m.framework].compressed += m.compressed;
    });

    const totalTokens = collectedMetrics.reduce((sum, m) => sum + m.tokens, 0);
    const totalCompressed = collectedMetrics.reduce((sum, m) => sum + m.compressed, 0);

    res.writeHead(200);
    res.end(
      JSON.stringify(
        {
          summary: {
            totalRepos: collectedMetrics.length,
            totalTokens,
            totalCompressed,
            reduction: ((1 - totalCompressed / totalTokens) * 100).toFixed(1) + '%',
          },
          byTenant,
          byFramework,
          repos: collectedMetrics,
        },
        null,
        2
      )
    );
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start services
async function start() {
  server.listen(PORT, () => {
    console.log(`\n🎯 Telemetry Service listening on port ${PORT}`);
    console.log(`   GET /metrics — Dashboard`);
    console.log(`   GET /health — Health\n`);
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Run ingestion pipeline
  await runIngestionPipeline();

  console.log('\n✅ Day 4 telemetry pipeline complete!');
  console.log('   Check CodeBurn mock at: http://localhost:3000/metrics-dashboard');
  console.log('   Check telemetry dashboard at: http://localhost:3001/metrics\n');
}

start().catch(console.error);
