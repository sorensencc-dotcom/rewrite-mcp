// filename: mas.js
// semver: 1.0.0
// date: 2026-05-20
// MAS Phase 1-2 Fusion — Unified MAS Subsystem

import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

import { analyzeSynergy, logSynergyDecision } from './synergyAnalyzer.js';
import { emitMASDecision, emitMASSignal } from '../../../../../apps/cic-pms/src/telemetryClient.js';
import {
  addFact,
  addEntity,
  addSignal,
  addHypothesis,
  addNote,
  addDecision,
  getBlackboard,
  queryFacts,
  queryEntities,
  querySignals,
  queryHypotheses,
  queryNotes
} from './blackboard.js';

const DATA_DIR = resolve(process.cwd(), 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function processTelemetry(packet) {
  const decision = analyzeSynergy(packet);
  logSynergyDecision(decision);

  addDecision({
    agent: packet.agent,
    drift: packet.drift,
    confidence: packet.confidence,
    action: decision.directive.action,
    target: decision.directive.target,
    reason: decision.directive.reason,
    correlationId: decision.correlationId
  });

  addSignal({
    agent: packet.agent,
    drift: packet.drift,
    confidence: packet.confidence
  });

  emitMASDecision({
    agent: packet.agent,
    directive: decision.directive.action,
    target: decision.directive.target,
    reason: decision.directive.reason,
    drift: packet.drift,
    confidence: packet.confidence,
    correlationId: decision.correlationId,
    ts: new Date().toISOString()
  });

  emitMASSignal({
    agent: packet.agent,
    drift: packet.drift,
    confidence: packet.confidence,
    correlationId: decision.correlationId,
    ts: new Date().toISOString()
  });

  return decision.directive;
}

export {
  addFact as publishFact,
  addEntity as publishEntity,
  addHypothesis as publishHypothesis,
  addNote as publishNote,
  getBlackboard as readBlackboard,
  queryFacts,
  queryEntities,
  querySignals,
  queryHypotheses,
  queryNotes
};
