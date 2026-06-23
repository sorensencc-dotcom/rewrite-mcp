/**
 * CIC Pipeline — Extract Stage
 * Routes files to appropriate analyzers based on MIME type
 */

import type { FileRecord } from '../types/fileRecord.js';
import type { AnalyzerResult } from '../types/analyzer.js';
import { analyzerRegistry } from '../analyzers/index.js';

export async function extractMetadata(file: FileRecord): Promise<AnalyzerResult> {
  // Route based on MIME type
  if (file.mimeType.startsWith('image/')) {
    const analyzer = analyzerRegistry.get('image_analyzer_v2');
    if (!analyzer) {
      throw new Error('image_analyzer_v2 not registered');
    }
    return analyzer.analyze(file);
  }

  // Add other MIME type handlers as needed
  throw new Error(`No analyzer available for MIME type: ${file.mimeType}`);
}
