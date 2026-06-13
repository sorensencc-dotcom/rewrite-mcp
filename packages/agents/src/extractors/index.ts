export { DomExtractor } from './dom.js';
export type { DomModel, DomNode, ExtractorOptions } from './dom.js';

export { StyleMatchEngine } from './style-engine.js';
export type { CssRule, StyleSheet, StyleMetrics } from './style-engine.js';

export { PlaywrightExtractor } from './playwright-extractor.js';
export type { PlaywrightOptions, ComputedStyle, InteractiveElement, ScreenshotMetadata, PlaywrightDomModel } from './playwright-extractor.js';

export { ComputedStylesAnalyzer } from './computed-styles.js';
export type { StyleCategory, ComputedStyleMetrics } from './computed-styles.js';

export { IRPacketV12Builder } from './ir-v1-2-extension.js';
export type { IRPacketV12Extension, ScreenshotReference, InteractiveMap, PerformanceSummary } from './ir-v1-2-extension.js';

export { WcagValidator } from './wcag-validator.js';
export type { WcagLevel, SeverityLevel, WcagIssue, WcagAuditResult, ContrastRatio } from './wcag-validator.js';

export { AccessibilityAuditor } from './accessibility-auditor.js';
export type { AccessibilityAuditReport, AccessibilityMetrics } from './accessibility-auditor.js';
