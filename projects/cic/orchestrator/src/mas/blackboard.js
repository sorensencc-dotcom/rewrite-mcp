// filename: blackboard.js
// semver: 1.0.0
// date: 2026-05-20
// MAS Phase 2 — Shared Blackboard Memory Plane
// Rewrite Labs Operator-Grade Standard (Node 20+, ESM, deterministic)

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

const BLACKBOARD_PATH = resolve(process.cwd(), 'data/mas-blackboard.json');

// -------------------------------
// Internal State
// -------------------------------

let state = {
  facts: [],        // atomic extracted facts
  entities: [],     // named entities, normalized
  signals: [],      // drift, confidence, anomalies
  hypotheses: [],   // agent-generated hypotheses
  notes: [],        // freeform agent notes
  decisions: [],    // MAS routing directives (persisted synergy decisions)
  version: 1
};

// Load persisted state if exists
if (existsSync(BLACKBOARD_PATH)) {
  try {
    const raw = readFileSync(BLACKBOARD_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state = parsed;
      state.decisions = state.decisions || [];
    }
  } catch {
    // corrupted file → start fresh
    state = { facts: [], entities: [], signals: [], hypotheses: [], notes: [], decisions: [], version: 1 };
  }
}

// -------------------------------
// Validation Helpers
// -------------------------------

function ensureObject(obj, label) {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`blackboard: invalid ${label} (not an object)`);
  }
}

function ensureString(s, label) {
  if (typeof s !== 'string' || !s.trim()) {
    throw new Error(`blackboard: invalid ${label} (empty string)`);
  }
}

function ensureNumber(n, label) {
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new Error(`blackboard: invalid ${label} (not a number)`);
  }
}

// -------------------------------
// Hash Utility
// -------------------------------

function hashEntry(entry) {
  return createHash('sha256')
    .update(JSON.stringify(entry))
    .digest('hex')
    .slice(0, 16);
}

// -------------------------------
// Persistence
// -------------------------------

function persist() {
  const snapshot = JSON.stringify(state, null, 2);
  writeFileSync(BLACKBOARD_PATH, snapshot);
}

// -------------------------------
// Public API
// -------------------------------

export function addFact(fact) {
  ensureObject(fact, 'fact');
  ensureString(fact.key, 'fact.key');
  ensureString(fact.value, 'fact.value');

  const entry = {
    ...fact,
    id: hashEntry(fact),
    ts: Date.now()
  };

  state.facts.push(entry);
  persist();
  return entry;
}

export function addEntity(entity) {
  ensureObject(entity, 'entity');
  ensureString(entity.name, 'entity.name');
  ensureString(entity.type, 'entity.type');

  const entry = {
    ...entity,
    id: hashEntry(entity),
    ts: Date.now()
  };

  state.entities.push(entry);
  persist();
  return entry;
}

export function addSignal(signal) {
  ensureObject(signal, 'signal');
  ensureString(signal.agent, 'signal.agent');
  ensureNumber(signal.drift, 'signal.drift');
  ensureNumber(signal.confidence, 'signal.confidence');

  const entry = {
    ...signal,
    id: hashEntry(signal),
    ts: Date.now()
  };

  state.signals.push(entry);
  persist();
  return entry;
}

export function addHypothesis(hyp) {
  ensureObject(hyp, 'hypothesis');
  ensureString(hyp.agent, 'hypothesis.agent');
  ensureString(hyp.text, 'hypothesis.text');

  const entry = {
    ...hyp,
    id: hashEntry(hyp),
    ts: Date.now()
  };

  state.hypotheses.push(entry);
  persist();
  return entry;
}

export function addNote(note) {
  ensureObject(note, 'note');
  ensureString(note.agent, 'note.agent');
  ensureString(note.text, 'note.text');

  const entry = {
    ...note,
    id: hashEntry(note),
    ts: Date.now()
  };

  state.notes.push(entry);
  persist();
  return entry;
}

// -------------------------------
// Query API
// -------------------------------

export function getBlackboard() {
  return JSON.parse(JSON.stringify(state));
}

export function queryFacts(filterFn) {
  return state.facts.filter(filterFn);
}

export function queryEntities(filterFn) {
  return state.entities.filter(filterFn);
}

export function querySignals(filterFn) {
  return state.signals.filter(filterFn);
}

export function queryHypotheses(filterFn) {
  return state.hypotheses.filter(filterFn);
}

export function queryNotes(filterFn) {
  return state.notes.filter(filterFn);
}

export function addDecision(decision) {
  ensureObject(decision, 'decision');
  ensureString(decision.agent, 'decision.agent');
  ensureString(decision.action, 'decision.action');

  const entry = {
    ...decision,
    id: hashEntry(decision),
    ts: new Date().toISOString()
  };

  state.decisions.push(entry);
  if (state.decisions.length > 200) state.decisions.shift();
  persist();
  return entry;
}

export function getDecisions() {
  return JSON.parse(JSON.stringify(state.decisions));
}
