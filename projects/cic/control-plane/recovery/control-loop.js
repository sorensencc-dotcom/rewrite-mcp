/**
 * recovery/control-loop.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Antigravity Autonomous Recovery Control Loop (C3).
 * Periodically pulls SLO metrics, evaluates policies, and applies recovery actions.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { aggregateSLOMetrics } = require('./slo-aggregator');
const { evaluatePolicies } = require('./policy-engine');
const defaultPolicySet = require('./policy-set.json');

const HISTORY_PATH = path.resolve(__dirname, 'history.json');
const INTERVAL_MS = process.env.RECOVERY_LOOP_INTERVAL_MS || 10000;

/**
 * Recovery Effectors
 * Implements the actual changes to the system state based on policy actions.
 */
class RecoveryEffectors {
  constructor() {
    this.history = this._loadHistory();
  }

  _loadHistory() {
    if (fs.existsSync(HISTORY_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
      } catch (err) {
        return [];
      }
    }
    return [];
  }

  _saveHistory() {
    try {
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history.slice(-100), null, 2));
    } catch (err) {
      console.error(`[RecoveryEffectors] Failed to save history: ${err.message}`);
    }
  }

  async apply(action) {
    const ts = new Date().toISOString();
    
    // Check if this action was recently applied to avoid flapping (simple dedupe)
    const recent = this.history.slice(-5).find(h => h.policyId === action.policyId && (new Date() - new Date(h.timestamp) < 30000));
    if (recent) {
      console.log(`[RecoveryAction] Skipping redundant action for policy ${action.policyId} (cooldown)`);
      return;
    }

    console.log(`[RecoveryAction] Applying ${action.type} for policy ${action.policyId}`);

    const event = {
      timestamp: ts,
      ...action
    };

    // 1. Log to history
    this.history.push(event);
    this._saveHistory();

    // 2. Perform the actual system adjustment
    switch (action.type) {
      case 'throttle':
        await this._throttle(action);
        break;
      case 'escalateFallback':
        await this._escalateFallback(action);
        break;
      case 'quarantine':
        await this._quarantine(action);
        break;
      case 'alertOperator':
        await this._alertOperator(action);
        break;
      default:
        console.warn(`[RecoveryAction] Unknown action type: ${action.type}`);
    }

    // 3. Emit Telemetry (Mocked for now, would hit the telemetry service)
    await this._emitTelemetry(event);
  }

  async _throttle(action) {
    // TODO: Hit Orchestrator API to reduce concurrency caps
    console.log(`[Effector] Throttling system by ${action.reduceByPct * 100}%`);
  }

  async _escalateFallback(action) {
    // TODO: Update shared config to force agents into safe-mode/fallback
    console.log(`[Effector] Escalating fallback to ${action.tier}`);
  }

  async _quarantine(action) {
    // TODO: Mark specific agents as quarantined in the registry
    console.log(`[Effector] Quarantining scope: ${action.scope}`);
  }

  async _alertOperator(action) {
    console.log(`[Effector] ALERT: Operator attention required (${action.level})`);
  }

  async _emitTelemetry(event) {
    // In a real implementation, this would use fetch to hit /ingest/recovery-event
  }
}

/**
 * The Control Loop
 */
class RecoveryControlLoop {
  constructor() {
    this.effectors = new RecoveryEffectors();
    this.timer = null;
    this.isProcessing = false;
  }

  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Sense (Pulls SLO Metrics)
      const metrics = await aggregateSLOMetrics();

      // 2. Think (Evaluates Policies)
      const evaluation = evaluatePolicies(metrics, defaultPolicySet);

      // 3. Act (Applies Actions)
      if (evaluation.actions.length > 0) {
        for (const action of evaluation.actions) {
          await this.effectors.apply(action);
        }
      }

    } catch (err) {
      console.error(`[ControlLoop] Tick failed: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  start() {
    if (this.timer) return;
    console.log(`[ControlLoop] Starting autonomous recovery loop (Interval: ${INTERVAL_MS}ms)`);
    this.timer = setInterval(() => this.tick(), INTERVAL_MS);
    // Initial tick
    this.tick();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[ControlLoop] Stopped.`);
    }
  }

  getHistory() {
    return this.effectors.history;
  }
}

module.exports = new RecoveryControlLoop();
