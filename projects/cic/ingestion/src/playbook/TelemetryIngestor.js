// File: projects/cic/ingestion/src/playbook/TelemetryIngestor.js | Date: 2026-05-31 | v1.0.0

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data/playbooks');
const TELEMETRY_FILE = path.join(DATA_DIR, 'telemetry_window.json');

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Reads telemetry data from local storage and filters out expired events.
 * 
 * @returns {Promise<Array<Object>>} Rolling 24-hour window of events.
 */
export async function getRollingWindow() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(TELEMETRY_FILE, 'utf-8');
    const events = JSON.parse(data);
    const now = Date.now();
    
    // Filter to retain only last 24h
    const activeEvents = events.filter(e => {
      const ts = new Date(e.timestamp || e.ts).getTime();
      return now - ts <= WINDOW_DURATION_MS;
    });
    
    return activeEvents;
  } catch (err) {
    // If file doesn't exist, return empty array
    return [];
  }
}

/**
 * Appends a new telemetry event to the rolling 24-hour cache.
 * 
 * @param {Object} event - Telemetry details.
 * @returns {Promise<boolean>} Success indicator.
 */
export async function addTelemetryEvent(event) {
  try {
    const window = await getRollingWindow();
    const newEvent = {
      ts: new Date().toISOString(),
      ...event
    };
    
    window.push(newEvent);
    await ensureDataDir();
    await fs.writeFile(TELEMETRY_FILE, JSON.stringify(window, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[TelemetryIngestor] Failed to save event: ${err.message}`);
    return false;
  }
}

/**
 * Resets the rolling telemetry window.
 * 
 * @returns {Promise<boolean>}
 */
export async function resetTelemetryWindow() {
  try {
    await ensureDataDir();
    await fs.writeFile(TELEMETRY_FILE, JSON.stringify([], null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Aggregates and normalizes 24h metrics into standardized feature vectors per extractor.
 * 
 * @param {Array<Object>} events - Window logs from getRollingWindow()
 * @returns {Array<Object>} Feature vectors per extractor.
 */
export function generateFeatureVectors(events = []) {
  if (!events || events.length === 0) {
    return [];
  }

  const grouped = {};
  
  for (const e of events) {
    const extractorName = e.extractor || e.skill_id || e.skillId;
    if (!extractorName) continue;
    
    if (!grouped[extractorName]) {
      grouped[extractorName] = {
        latencies: [],
        accuracies: [],
        drifts: [],
        contradictions: [],
        entityDensities: [],
        relationshipDensities: []
      };
    }
    
    const scores = e.scores || {};
    const latency = e.latency_ms || e.latencySummary?.p50Ms || scores.latency || e.latencyP95 || 0;
    const accuracy = typeof e.accuracy === 'number' ? e.accuracy : (typeof scores.accuracy === 'number' ? scores.accuracy / 100 : 0.9);
    const drift = e.drift_detected || e.driftDetected ? 1.0 : 0.0;
    const contradiction = typeof e.contradictionRate === 'number' ? e.contradictionRate : (typeof e.contradictions === 'number' ? e.contradictions : 0.0);
    const entityDensity = typeof e.entityDensity === 'number' ? e.entityDensity : (typeof e.graph?.entityDensity === 'number' ? e.graph.entityDensity : 0.0);
    const relationshipDensity = typeof e.relationshipDensity === 'number' ? e.relationshipDensity : (typeof e.graph?.relationshipDensity === 'number' ? e.graph.relationshipDensity : 0.0);
    
    if (latency > 0) grouped[extractorName].latencies.push(latency);
    grouped[extractorName].accuracies.push(accuracy);
    grouped[extractorName].drifts.push(drift);
    grouped[extractorName].contradictions.push(contradiction);
    if (entityDensity > 0) grouped[extractorName].entityDensities.push(entityDensity);
    if (relationshipDensity > 0) grouped[extractorName].relationshipDensities.push(relationshipDensity);
  }
  
  const vectors = [];
  
  for (const [name, data] of Object.entries(grouped)) {
    const sortedLatencies = [...data.latencies].sort((a, b) => a - b);
    const latencyP95 = sortedLatencies.length > 0 
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] 
      : 300;
    
    const avgAccuracy = data.accuracies.length > 0 
      ? data.accuracies.reduce((sum, v) => sum + v, 0) / data.accuracies.length 
      : 0.9;
      
    const driftRate = data.drifts.length > 0 
      ? data.drifts.reduce((sum, v) => sum + v, 0) / data.drifts.length 
      : 0.0;
      
    const avgContradictions = data.contradictions.length > 0 
      ? data.contradictions.reduce((sum, v) => sum + v, 0) / data.contradictions.length 
      : 0.0;
      
    const avgEntityDensity = data.entityDensities.length > 0 
      ? data.entityDensities.reduce((sum, v) => sum + v, 0) / data.entityDensities.length 
      : 0.5;
      
    const avgRelationshipDensity = data.relationshipDensities.length > 0 
      ? data.relationshipDensities.reduce((sum, v) => sum + v, 0) / data.relationshipDensities.length 
      : 0.3;
      
    vectors.push({
      extractor: name,
      accuracy: Math.round(avgAccuracy * 100) / 100,
      latencyP95: Math.round(latencyP95),
      drift: Math.round(driftRate * 100) / 100,
      contradictions: Math.round(avgContradictions * 10000) / 10000,
      entityDensity: Math.round(avgEntityDensity * 100) / 100,
      relationshipDensity: Math.round(avgRelationshipDensity * 100) / 100
    });
  }
  
  return vectors;
}

export default {
  getRollingWindow,
  addTelemetryEvent,
  resetTelemetryWindow,
  generateFeatureVectors
};
