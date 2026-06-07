/**
 * validator.mjs - v0.1.0
 * 6-metric validation harness for redesign outputs
 */

import fs from 'node:fs';
import path from 'node:path';
import { log } from '../logging/logger.js';

const MODULE = 'SkillOptValidator';

/**
 * @typedef {Object} ValidationResult
 * @property {number} structural_completeness - 0–1, sections present
 * @property {number} heuristic_alignment - 0–1, addresses audit issues
 * @property {number} accessibility_uplift - 0–1, a11y improvements
 * @property {number} performance_uplift - 0–1, perf improvements
 * @property {number} brand_voice_similarity - 0–1, brand alignment
 * @property {number} determinism_score - 0–1, consistency
 * @property {number} overall - 0–1, weighted average
 * @property {Array<string>} warnings - issues found
 */

/**
 * Validate a redesign output against its input
 * @param {Object} input - SkillOptItem (input.json)
 * @param {string} output - Redesign plan Markdown
 * @returns {ValidationResult}
 */
export function validateRedesignOutput(input, output) {
  const warnings = [];
  const scores = {};

  // ─────────────────────────────────────────────────────────────────
  // 1. Structural Completeness
  // ─────────────────────────────────────────────────────────────────
  const requiredSections = [
    'Redesign Summary',
    'Information Architecture',
    'Layout & Structure',
    'Visual & Interaction',
    'Content & Messaging',
    'Accessibility & Performance',
    'Implementation Notes',
  ];

  const foundSections = requiredSections.filter(s => output.includes(s)).length;
  scores.structural_completeness = foundSections / requiredSections.length;

  if (foundSections < requiredSections.length) {
    warnings.push(`Missing ${requiredSections.length - foundSections} required sections`);
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. Heuristic Alignment (addresses audit deltas)
  // ─────────────────────────────────────────────────────────────────
  const auditKeys = Object.keys(input.auditDeltas || {});
  const addressedKeys = auditKeys.filter(k => output.toLowerCase().includes(k.toLowerCase())).length;
  scores.heuristic_alignment = auditKeys.length > 0 ? addressedKeys / auditKeys.length : 1.0;

  if (addressedKeys < auditKeys.length) {
    warnings.push(`Output addresses ${addressedKeys}/${auditKeys.length} audit issues`);
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. Accessibility Uplift
  // ─────────────────────────────────────────────────────────────────
  const a11yKeywords = ['WCAG', 'accessible', 'focus', 'screen reader', 'alt text', 'semantic'];
  const a11yMatches = a11yKeywords.filter(kw => output.toLowerCase().includes(kw.toLowerCase())).length;
  scores.accessibility_uplift = a11yMatches / a11yKeywords.length;

  if (a11yMatches < 3) {
    warnings.push(`Low accessibility coverage (${a11yMatches}/${a11yKeywords.length} keywords)`);
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. Performance Uplift
  // ─────────────────────────────────────────────────────────────────
  const perfKeywords = ['LCP', 'CLS', 'FID', 'lazy-load', 'optimize', 'cache'];
  const perfMatches = perfKeywords.filter(kw => output.toLowerCase().includes(kw.toLowerCase())).length;
  scores.performance_uplift = perfMatches / perfKeywords.length;

  if (perfMatches < 2) {
    warnings.push(`Low performance coverage (${perfMatches}/${perfKeywords.length} keywords)`);
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. Brand Voice Similarity
  // ─────────────────────────────────────────────────────────────────
  const brandVoice = input.metadata?.brandVoice || '';
  const voiceMatches = brandVoice && output.toLowerCase().includes(brandVoice.toLowerCase()) ? 1 : 0.5;
  scores.brand_voice_similarity = voiceMatches;

  if (voiceMatches < 0.9) {
    warnings.push(`Brand voice may not be fully represented (${(voiceMatches * 100).toFixed(0)}%)`);
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. Determinism Score (output stability)
  // ─────────────────────────────────────────────────────────────────
  // For now: check for vague language that reduces determinism
  const vagueTerms = ['maybe', 'possibly', 'consider', 'think about', 'might'];
  const vagueMatches = vagueTerms.filter(t => output.toLowerCase().includes(t)).length;
  scores.determinism_score = Math.max(0, 1 - vagueMatches * 0.1);

  if (vagueMatches > 2) {
    warnings.push(`Output contains vague language (${vagueMatches} terms)`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Overall Score (weighted average)
  // ─────────────────────────────────────────────────────────────────
  const weights = {
    structural_completeness: 0.2,
    heuristic_alignment: 0.25,
    accessibility_uplift: 0.15,
    performance_uplift: 0.15,
    brand_voice_similarity: 0.15,
    determinism_score: 0.1,
  };

  const overall = Object.entries(weights).reduce((sum, [k, w]) => sum + (scores[k] * w), 0);

  log.info('validation_complete', {
    module: MODULE,
    ...scores,
    overall: overall.toFixed(3),
    warning_count: warnings.length,
  });

  return {
    ...scores,
    overall,
    warnings,
  };
}

/**
 * Validate from file paths (dev CLI use)
 * @param {string} itemPath - path to input.json
 * @param {string} outputPath - path to output.md
 * @returns {ValidationResult}
 */
export function validateSingleItem(itemPath, outputPath) {
  const input = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
  const output = fs.readFileSync(outputPath, 'utf8');
  return validateRedesignOutput(input, output);
}
