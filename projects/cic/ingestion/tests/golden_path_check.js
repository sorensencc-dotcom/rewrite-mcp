/**
 * projects/cic/ingestion/tests/golden_path_check.js
 * Standalone integration test for Harvester -> PMS -> Gemini flow.
 */
import { analyzeImage } from '../src/harvester/extractors/imageAnalyzer.js';
import { buildPrompt } from '../src/harvester/pmsClient.js';
import { geminiClient } from '../src/harvester/models/geminiClient.js';

// --- Mocks ---

// Mock pms modules since they might not be easily importable or have issues in this env
// Actually, I'll try to use the real ones first if possible.

// Mock geminiClient to avoid real API calls
const originalRun = geminiClient.run;
geminiClient.run = async (payload) => {
  console.log('Mock Gemini received payload:', JSON.stringify(payload, null, 2));
  
  if (payload.context.mode === 'image_analysis') {
    return {
      output: JSON.stringify({
        objects: ['Ford Model T', 'Assembly Line'],
        scenes: ['Factory Interior'],
        people: ['Workers'],
        confidence: 0.95
      }),
      usage: { promptTokens: 100, candidatesTokens: 50, totalTokens: 150 }
    };
  }
  return { output: '{}', usage: {} };
};

async function runTest() {
  console.log('Starting Golden Path Check...');

  try {
    const result = await analyzeImage({
      imageBase64: 'fake-base64-data',
      filePath: '/path/to/image.jpg',
      metadata: { originalFilename: 'model_t.jpg' }
    });

    console.log('Analysis Result:', JSON.stringify(result, null, 2));

    // Validations
    if (result.objects.includes('Ford Model T') && result.confidence === 0.95) {
      console.log('✅ Golden Path Check PASSED');
    } else {
      console.log('❌ Golden Path Check FAILED: Unexpected result shape or content');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Golden Path Check FAILED with error:', error);
    process.exit(1);
  } finally {
    // Restore
    geminiClient.run = originalRun;
  }
}

runTest();
