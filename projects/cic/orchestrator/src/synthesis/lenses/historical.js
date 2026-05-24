/**
 * projects/cic/orchestrator/src/synthesis/lenses/historical.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Historical Lens
 * Anchors assets in the Sorensen/Ford timeline using deterministic rule-based matching.
 */

import { ERAS, FACILITIES, EVENTS } from './historicalTimeline.js';

/**
 * Runs the Historical Lens on an Asset Intelligence Record.
 * 
 * @param {Object} air - Asset Intelligence Record
 * @returns {Promise<Object>} - HistoricalLensResult
 */
export async function runHistoricalLens(air) {
  // 1. Build context signals
  const corpus = [
    air.audio?.transcript?.text ?? "",
    air.textSignals?.ocrText ?? ""
  ].join(" ").toLowerCase();

  const sceneLabels = air.vision?.scenes?.map(s => s.label.toLowerCase()) ?? [];
  const objectNames = air.vision?.objects?.map(o => o.name.toLowerCase()) ?? [];

  // 2. Score candidates
  const eraScores = _scoreItems(ERAS, corpus, sceneLabels, objectNames);
  const facilityScores = _scoreItems(FACILITIES, corpus, sceneLabels, objectNames);
  const eventScores = _scoreItems(EVENTS, corpus, sceneLabels, objectNames);

  // 3. Select best candidates (deterministic via id sort)
  const bestEra = eraScores.length > 0 && eraScores[0].score > 0 ? eraScores[0].item : null;
  const bestFacility = facilityScores.length > 0 && facilityScores[0].score > 0 ? facilityScores[0].item : null;
  const bestEvent = eventScores.length > 0 && eventScores[0].score > 0 ? eventScores[0].item : null;

  // 4. Compute confidence
  const confidence = _computeHistoricalConfidence(
    bestEra ? eraScores[0].score : 0,
    bestFacility ? facilityScores[0].score : 0,
    bestEvent ? eventScores[0].score : 0
  );

  // 5. Generate tags
  const tags = [];
  if (bestEra) tags.push(bestEra.id);
  if (bestFacility) tags.push(bestFacility.id);
  if (bestEvent) tags.push(bestEvent.id);
  tags.sort();

  // 6. Build analysis text
  const analysis = _buildHistoricalAnalysis(bestEra, bestFacility, bestEvent, confidence);

  return {
    analysis,
    tags,
    confidence
  };
}

/**
 * Internal scoring logic for timeline items.
 */
function _scoreItems(items, corpus, sceneLabels, objectNames) {
  return items.map(item => {
    let score = 0;
    item.keywords.forEach(keyword => {
      const kw = keyword.toLowerCase();
      // Corpus match
      if (corpus.includes(kw)) score += 3;
      // Scene match
      if (sceneLabels.includes(kw)) score += 2;
      // Object match
      if (objectNames.includes(kw)) score += 2;
    });

    // Bonus for scene overlap defined in registry
    if (item.scenes) {
      item.scenes.forEach(scene => {
        if (sceneLabels.includes(scene.toLowerCase())) score += 1;
      });
    }

    return { item, score };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.id.localeCompare(b.item.id); // Tie-break
  });
}

function _computeHistoricalConfidence(eraScore, facilityScore, eventScore) {
  const maxScore = 30; // Heuristic for a "strong" match
  const raw = (eraScore * 0.5 + facilityScore * 0.3 + eventScore * 0.2) / maxScore;
  const clamped = Math.max(0, Math.min(1, raw));
  return parseFloat(clamped.toFixed(3));
}

function _buildHistoricalAnalysis(era, facility, event, confidence) {
  if (!era && !facility && !event) {
    return "Historical context could not be confidently determined from the available visual and textual signals.";
  }

  const parts = [];

  if (era) {
    const yearsText = era.years ? ` (${era.years[0]}–${era.years[1]})` : "";
    parts.push(`This asset most likely belongs to the ${era.label} period${yearsText}.`);
  }

  if (facility) {
    parts.push(`Visual and textual cues suggest a connection to ${facility.label}.`);
  }

  if (event) {
    parts.push(`Specific signals indicate relevance to "${event.label}".`);
  }

  parts.push(`Overall historical confidence: ${(confidence * 100).toFixed(1)}%.`);

  return parts.join(" ");
}
