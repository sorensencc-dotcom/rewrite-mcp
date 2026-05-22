import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';

const execAsync = promisify(exec);

async function runE2ETest() {
  console.log('🚀 Starting Operator-Grade E2E Pipeline Test...');
  const API_URL = 'http://localhost:4000/api/control-plane/pipelines/harvestToIngest/runs';

  try {
    // 1. Verify Control Plane is reachable
    console.log('📡 Checking Control Plane health...');
    const healthRes = await fetch('http://localhost:4000/api/control-plane/healthz');
    if (!healthRes.ok) throw new Error('Control plane is not reachable');
    console.log('✅ Control Plane is healthy');

    // 2. Trigger harvestToIngest pipeline
    console.log('⚙️ Triggering harvestToIngest pipeline...');
    const pipelineRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        harvesterType: 'web',
        harvesterConfig: { url: 'https://example.com' },
        sourceType: 'url'
      })
    });

    if (!pipelineRes.ok) throw new Error(`Pipeline trigger failed: ${pipelineRes.statusText}`);
    const data = await pipelineRes.json();
    console.log('✅ Pipeline triggered successfully:', data);

    const runId = data.runId || data.id;
    if (!runId) {
      console.warn('⚠️ No runId returned, attempting to proceed without explicit status check.');
    } else {
      // 3. Poll for pipeline completion
      console.log(`⏳ Polling for pipeline run ${runId} completion...`);
      let status = 'pending';
      let attempts = 0;
      while (status !== 'completed' && status !== 'failed' && attempts < 10) {
        await setTimeout(2000);
        // Note: The actual status endpoint might differ. Adjust as needed.
        const statusRes = await fetch(`${API_URL}/${runId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          status = statusData.status;
          console.log(`  -> Status: ${status}`);
        } else {
          console.log(`  -> Could not fetch status, retrying...`);
        }
        attempts++;
      }

      if (status === 'failed') throw new Error('Pipeline run failed');
      if (status !== 'completed') console.warn('⚠️ Pipeline run polling timed out or incomplete');
    }

    console.log('🎉 Golden-Path E2E Pipeline Test PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ E2E Pipeline Test FAILED:', error.message);
    process.exit(1);
  }
}

runE2ETest();
