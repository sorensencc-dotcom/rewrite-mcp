import { ReverseImageSearchExtractor } from './src/extractors/reverseImageSearch.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const mockCtx = {
  logDebug: (msg, data) => console.log(`[DEBUG] ${msg}`, data),
  logWarn: (msg, data) => console.log(`[WARN] ${msg}`, data),
  logError: (msg, data) => console.log(`[ERROR] ${msg}`, data)
};

// Create 3 test envelopes
const testEnvelopes = [
  {
    id: 'test-envelope-1',
    region: 'us',
    source: { type: 'image' },
    content: { media: [{ type: 'image', data: Buffer.from('test1') }], metadata: {} }
  },
  {
    id: 'test-envelope-2',
    region: 'us',
    source: { type: 'image' },
    content: { media: [{ type: 'image', data: Buffer.from('test2') }], metadata: {} }
  },
  {
    id: 'test-envelope-3',
    region: 'us',
    source: { type: 'image' },
    content: { media: [{ type: 'image', data: Buffer.from('test3') }], metadata: {} }
  }
];

// Run extraction
const artifactFile = path.join(outputDir, 'artifacts.jsonl');
fs.writeFileSync(artifactFile, ''); // Clear file

(async () => {
  for (const envelope of testEnvelopes) {
    console.log(`Processing ${envelope.id}...`);

    const input = {
      envelope,
      text: null,
      media: envelope.content.media,
      metadata: envelope.content.metadata
    };

    try {
      const result = await ReverseImageSearchExtractor.run(input, mockCtx);

      result.artifacts.forEach(artifact => {
        fs.appendFileSync(artifactFile, JSON.stringify({ envelopeId: envelope.id, artifact }) + '\n');
      });

      console.log(`  ✓ Generated ${result.artifacts.length} artifacts`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  console.log(`\n✓ All artifacts written to ${artifactFile}`);
  console.log('\nSample artifact:');
  const lines = fs.readFileSync(artifactFile, 'utf8').split('\n').filter(l => l);
  if (lines.length > 0) {
    console.log(JSON.stringify(JSON.parse(lines[0]), null, 2));
  }
})();
