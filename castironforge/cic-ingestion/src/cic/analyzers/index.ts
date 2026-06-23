/**
 * CIC Analyzers Index
 * Exports and registers all available analyzers
 */

import { imageAnalyzerV2 } from './image/v2/imageAnalyzerV2Adapter.js';
import { analyzerRegistry } from '../registry/AnalyzerRegistry.js';

// Register all analyzers
analyzerRegistry.register(imageAnalyzerV2.id, imageAnalyzerV2);

export { imageAnalyzerV2 };
export { analyzerRegistry };
