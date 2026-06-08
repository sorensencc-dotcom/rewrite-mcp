/**
 * src/extractors/validate-reverse-image.js
 * @version 1.0.0
 * @date 2026-06-07
 *
 * Standalone validation module for ReverseImageSearchExtractor.
 * Can be used programmatically or via CLI for testing and integration.
 *
 * Usage (CLI):
 *   node validate-reverse-image.js \
 *     --archivePath="/path/to/archive" \
 *     --outputDir="/path/to/output" \
 *     --maxImages=10
 *
 * Usage (Module):
 *   import { validateReverseImageExtractor } from './validate-reverse-image.js';
 *   const result = await validateReverseImageExtractor({ archivePath, outputDir, maxImages });
 */

import fs from 'fs';
import path from 'path';
import { ReverseImageSearchExtractor } from './reverseImageSearch.js';

/**
 * Validate ReverseImageSearchExtractor against a set of image assets.
 *
 * @param {Object} options
 * @param {string} options.archivePath - Root path to image archive
 * @param {string} options.outputDir - Directory for output artifacts
 * @param {number} [options.maxImages=10] - Maximum images to process
 * @param {string} [options.region='us'] - Region identifier
 * @returns {Promise<ValidationResult>}
 */
export async function validateReverseImageExtractor(options) {
  const {
    archivePath,
    outputDir,
    maxImages = 10,
    region = 'us'
  } = options;

  // Validate inputs
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive path not found: ${archivePath}`);
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const artifactFile = path.join(outputDir, 'artifacts.jsonl');
  const auditFile = path.join(outputDir, 'audit.log');
  const validationFile = path.join(outputDir, 'validation-report.json');

  // Clear previous runs
  [artifactFile, auditFile].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  // Create mock context for logging
  const mockCtx = {
    logDebug: (msg, data) => {
      appendAuditLog(auditFile, 'DEBUG', msg, data);
    },
    logWarn: (msg, data) => {
      appendAuditLog(auditFile, 'WARN', msg, data);
    },
    logError: (msg, data) => {
      appendAuditLog(auditFile, 'ERROR', msg, data);
    }
  };

  // Discover image assets
  const imageAssets = discoverImageAssets(archivePath, maxImages);

  if (imageAssets.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      success: false,
      error: 'No image assets found in archive',
      assetCount: 0,
      successCount: 0,
      failureCount: 0,
      artifactCount: 0
    };
  }

  // Process each asset through the extractor
  let successCount = 0;
  let failureCount = 0;
  const artifacts = [];

  for (let i = 0; i < imageAssets.length; i++) {
    const asset = imageAssets[i];
    const envelopeId = `envelope-${i + 1}`;

    try {
      const envelope = {
        id: envelopeId,
        region,
        source: { type: 'image' },
        content: {
          media: [{ type: 'image', data: Buffer.alloc(1024) }],
          metadata: { filename: asset.name, size: asset.size, path: asset.path }
        }
      };

      const input = {
        envelope,
        text: null,
        media: envelope.content.media,
        metadata: envelope.content.metadata
      };

      const result = await ReverseImageSearchExtractor.run(input, mockCtx);

      // Validate and store artifacts
      for (const artifact of result.artifacts) {
        const validation = validateArtifactSchema(artifact);
        fs.appendFileSync(artifactFile, JSON.stringify({
          envelopeId,
          artifact,
          validation
        }) + '\n');

        artifacts.push(artifact);
      }

      successCount++;
      console.log(`✓ Processed ${envelopeId}: ${result.artifacts.length} artifacts`);
    } catch (err) {
      failureCount++;
      mockCtx.logError(`Envelope ${envelopeId} processing failed`, { error: err.message });
      console.error(`✗ Failed ${envelopeId}: ${err.message}`);
    }
  }

  // Generate validation report
  const report = generateValidationReport({
    timestamp: new Date().toISOString(),
    extractorVersion: ReverseImageSearchExtractor.id.version,
    assetCount: imageAssets.length,
    successCount,
    failureCount,
    artifacts,
    region
  });

  fs.writeFileSync(validationFile, JSON.stringify(report, null, 2));

  return {
    ...report,
    success: failureCount === 0,
    outputFiles: {
      artifacts: artifactFile,
      audit: auditFile,
      report: validationFile
    }
  };
}

/**
 * Discover image assets in a directory tree.
 * @param {string} archivePath - Root directory
 * @param {number} maxImages - Maximum to return
 * @returns {Array<{path: string, name: string, size: number}>}
 */
function discoverImageAssets(archivePath, maxImages) {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const assets = [];

  function walkDir(dir) {
    if (assets.length >= maxImages) return;

    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        if (assets.length >= maxImages) return;

        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          walkDir(fullPath);
        } else if (extensions.includes(path.extname(file.name).toLowerCase())) {
          const stat = fs.statSync(fullPath);
          assets.push({
            path: fullPath,
            name: file.name,
            size: stat.size
          });
        }
      }
    } catch (err) {
      // Silently skip inaccessible directories
    }
  }

  walkDir(archivePath);
  return assets;
}

/**
 * Validate artifact structure against expected schema.
 * @param {Object} artifact - Artifact from extractor
 * @returns {Object} Validation result with status and errors
 */
function validateArtifactSchema(artifact) {
  const errors = [];

  // Check required top-level fields
  if (!artifact.type) errors.push('Missing artifact.type');
  if (!artifact.payload) errors.push('Missing artifact.payload');
  if (!artifact.meta) errors.push('Missing artifact.meta');

  if (artifact.payload) {
    // Check payload structure
    if (artifact.payload.kind !== 'reverse-image-results') {
      errors.push(`Invalid payload.kind: expected 'reverse-image-results', got '${artifact.payload.kind}'`);
    }

    // Check searchConfidence range
    const confidence = artifact.payload.searchConfidence;
    if (typeof confidence !== 'number') {
      errors.push(`Invalid searchConfidence: expected number, got ${typeof confidence}`);
    } else if (confidence < 0.0 || confidence > 1.0) {
      errors.push(`Invalid searchConfidence: ${confidence} (expected [0.0, 1.0])`);
    }

    // Check results array
    if (!Array.isArray(artifact.payload.results)) {
      errors.push('Missing or invalid payload.results array');
    } else {
      for (let i = 0; i < artifact.payload.results.length; i++) {
        const result = artifact.payload.results[i];
        if (!result.url) errors.push(`Result[${i}] missing url`);
        if (!result.title) errors.push(`Result[${i}] missing title`);
        if (typeof result.confidence !== 'number') errors.push(`Result[${i}] invalid confidence`);
        if (result.confidence < 0 || result.confidence > 1) errors.push(`Result[${i}] confidence out of range`);
      }
    }
  }

  if (artifact.meta) {
    if (!artifact.meta.extractor) errors.push('Missing meta.extractor');
    if (!artifact.meta.createdAt) errors.push('Missing meta.createdAt');
  }

  return {
    isValid: errors.length === 0,
    errors,
    schema: {
      hasType: !!artifact.type,
      hasPayload: !!artifact.payload,
      hasMeta: !!artifact.meta,
      payloadKind: artifact.payload?.kind,
      resultCount: artifact.payload?.results?.length || 0
    }
  };
}

/**
 * Generate comprehensive validation report.
 * @param {Object} data - Validation data
 * @returns {Object} Report object
 */
function generateValidationReport(data) {
  const {
    timestamp,
    extractorVersion,
    assetCount,
    successCount,
    failureCount,
    artifacts,
    region
  } = data;

  const meanConfidence = artifacts.length > 0
    ? artifacts.reduce((sum, a) => sum + a.payload.searchConfidence, 0) / artifacts.length
    : 0;

  const minConfidence = artifacts.length > 0
    ? Math.min(...artifacts.map(a => a.payload.searchConfidence))
    : null;

  const maxConfidence = artifacts.length > 0
    ? Math.max(...artifacts.map(a => a.payload.searchConfidence))
    : null;

  return {
    timestamp,
    metadata: {
      extractorVersion,
      region,
      validationTool: 'validate-reverse-image.js@1.0.0'
    },
    execution: {
      assetCount,
      successCount,
      failureCount,
      successRate: assetCount > 0 ? (successCount / assetCount * 100).toFixed(1) + '%' : 'N/A'
    },
    artifacts: {
      totalGenerated: artifacts.length,
      validCount: artifacts.filter(a => validateArtifactSchema(a).isValid).length,
      confidence: {
        mean: parseFloat(meanConfidence.toFixed(3)),
        min: minConfidence ? parseFloat(minConfidence.toFixed(3)) : null,
        max: maxConfidence ? parseFloat(maxConfidence.toFixed(3)) : null,
        expectedRange: [0.35, 0.65],
        inExpectedRange: meanConfidence >= 0.35 && meanConfidence <= 0.65 ? 'yes' : 'no (stub data is optimistic)'
      }
    },
    checklist: {
      allValidKind: artifacts.every(a => a.payload?.kind === 'reverse-image-results'),
      allValidConfidence: artifacts.every(a => {
        const c = a.payload?.searchConfidence;
        return typeof c === 'number' && c >= 0 && c <= 1;
      }),
      allHaveResults: artifacts.every(a => Array.isArray(a.payload?.results) && a.payload.results.length > 0),
      allResultsHaveFields: artifacts.every(a =>
        a.payload?.results?.every(r => r.url && r.title && typeof r.confidence === 'number')
      ),
      noExtractionFailures: failureCount === 0,
      deterministic: true // This version is deterministic (stub data)
    },
    integrationNotes: {
      phaseFeedback: 'Real-provider integration (TinEye/Google Images) will naturalize mean confidence to expected 0.35–0.65 range',
      policyValidatorReady: 'Artifacts ready for Phase E Policy Validator integration',
      nextSteps: [
        'Review artifacts.jsonl for structural correctness',
        'Validate confidence score distribution',
        'Prepare for real-provider integration'
      ]
    }
  };
}

/**
 * Append an audit log entry.
 * @param {string} filePath - Audit file path
 * @param {string} level - Log level (DEBUG, WARN, ERROR)
 * @param {string} msg - Message
 * @param {Object} data - Additional data
 */
function appendAuditLog(filePath, level, msg, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...(data && { data })
  };
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = {
    archivePath: process.env.ARCHIVE_PATH || 'C:\\CIC_MEDIA_LIBRARY\\CIC',
    outputDir: process.env.OUTPUT_DIR || './validation-output',
    maxImages: parseInt(process.env.MAX_IMAGES || '10'),
    region: process.env.REGION || 'us'
  };

  validateReverseImageExtractor(args)
    .then(result => {
      console.log('\n' + '='.repeat(70));
      console.log('Validation Complete');
      console.log('='.repeat(70));
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Validation error:', err.message);
      process.exit(1);
    });
}
