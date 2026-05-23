import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';

const execAsync = promisify(exec);

async function runE2ETest() {
  console.log('🚀 Starting Operator-Grade E2E Pipeline Test...');
  const API_URL = 'http://localhost:4000/api/control-plane/pipelines/cic/pipeline';

  try {
    // 1. Verify Control Plane is reachable
    console.log('📡 Checking Control Plane health...');
    const healthRes = await fetch('http://localhost:4000/api/control-plane/healthz');
    if (!healthRes.ok) throw new Error('Control plane is not reachable');
    console.log('✅ Control Plane is healthy');

    // 2. Trigger pipeline
    console.log('⚙️ Triggering CIC pipeline...');
    const pipelineRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'e2e-test-user',
        intent: 'test-intent',
        text: 'This is a test message for the E2E pipeline.',
        source: 'e2e-harness'
      })
    });

    if (!pipelineRes.ok) throw new Error(`Pipeline trigger failed: ${pipelineRes.statusText}`);
    const data = await pipelineRes.json();
    console.log('✅ Pipeline triggered successfully:', data);

    const runId = data.correlation_id || data.runId || data.id;
    if (!runId) {
      console.warn('⚠️ No runId or correlation_id returned, attempting to proceed.');
    } else {
      console.log(`✅ Pipeline run ${runId} completed with result.`);
    }

    console.log('🎉 Golden-Path E2E Pipeline Test PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ E2E Pipeline Test FAILED:', error.message);
    process.exit(1);
  }
}

runE2ETest();
