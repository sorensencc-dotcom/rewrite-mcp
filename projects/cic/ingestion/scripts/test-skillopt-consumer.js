/**
 * File: projects/cic/ingestion/scripts/test-skillopt-consumer.js | Date: 2026-05-30 | v1.0.0
 * Verification script for the SkillOptConsumer integration.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SkillOptConsumer } from '../src/skillopt/consumer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('── Running SkillOpt Consumer Verification ──');

  const skillsDir = path.join(__dirname, '../skills');
  const outputDir = path.join(__dirname, '../skillopt/data');

  console.log(`Skills Directory: ${skillsDir}`);
  console.log(`Output Directory: ${outputDir}`);

  // 1. Initialize consumer
  const consumer = new SkillOptConsumer({
    skillsDir,
    outputDir,
    devMode: true
  });

  // 2. Mock event
  const mockEvent = {
    id: 'test-event-123',
    intent: 'redesign',
    dom: '<html><body><div id="content"><h1>Welcome to Cast Iron Productions</h1><p>Classic film archival systems.</p></div></body></html>',
    contentBlocks: [
      { id: 'block-1', text: 'Welcome to Cast Iron Productions', type: 'heading' },
      { id: 'block-2', text: 'Classic film archival systems.', type: 'paragraph' }
    ],
    auditDeltas: {
      contrast: 'Missing high contrast ratio on hero header',
      altText: 'Archival images lack descriptive alt tags'
    },
    metadata: {
      brandVoice: 'warm, cinematic, historical'
    }
  };

  console.log('\nConsuming mock event...');
  await consumer.consume(mockEvent);

  // 3. Locate output files
  console.log('\nChecking output directory...');
  if (!fs.existsSync(outputDir)) {
    console.error('❌ Error: Output directory was not created!');
    process.exit(1);
  }

  const files = fs.readdirSync(outputDir);
  console.log('Created Files:', files);

  const jsonFiles = files.filter(f => f.startsWith('item-') && f.endsWith('.json'));
  const mdFiles = files.filter(f => f.startsWith('item-') && f.endsWith('.md'));

  if (jsonFiles.length === 0 || mdFiles.length === 0) {
    console.error('❌ Error: No output JSON or Markdown files found!');
    process.exit(1);
  }

  const jsonPath = path.join(outputDir, jsonFiles[0]);
  const mdPath = path.join(outputDir, mdFiles[0]);

  // Read JSON
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log('\n✅ JSON Output Verified!');
  console.log(`Item ID: ${jsonData.id}`);
  console.log(`Validation Score: ${jsonData.validation.overall}`);
  console.log('Validation Scores Breakdown:', {
    structural_completeness: jsonData.validation.structural_completeness,
    heuristic_alignment: jsonData.validation.heuristic_alignment,
    accessibility_uplift: jsonData.validation.accessibility_uplift,
    performance_uplift: jsonData.validation.performance_uplift,
    brand_voice_similarity: jsonData.validation.brand_voice_similarity,
    determinism_score: jsonData.validation.determinism_score,
  });
  console.log('Warnings:', jsonData.validation.warnings);

  // Read MD
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  console.log('\n✅ Markdown Output Verified!');
  console.log('First 20 lines of Markdown:');
  console.log(mdContent.split('\n').slice(0, 20).join('\n'));

  console.log('\n🎉 ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Run failed:', err);
  process.exit(1);
});
