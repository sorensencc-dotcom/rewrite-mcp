import {
  GUARD_STATUS,
  TRIP_REASON,
  createGuardConfig,
  createActionTrace,
  createGuardEvaluation
} from './types.mjs';

export class ActiveFocusLoopGuard {
  constructor(configOverrides = {}) {
    this.config = createGuardConfig(configOverrides);
    this.traces = [];
    this.turnCount = 0;
    this.status = GUARD_STATUS.HEALTHY;
    this.lastEvaluation = null;
  }

  reset() {
    this.traces = [];
    this.turnCount = 0;
    this.status = GUARD_STATUS.HEALTHY;
    this.lastEvaluation = null;
  }

  getTurnCount() {
    return this.turnCount;
  }

  getTraces() {
    return [...this.traces];
  }

  getStatus() {
    return this.status;
  }

  createEscalationPayload(reason, actionTrace, details = {}) {
    return {
      escalationId: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      status: 'ESCALATED',
      reason,
      turnCount: this.turnCount,
      actionTrace,
      recentTraces: this.traces.slice(-5),
      recommendedAction: 'HUMAN_APPROVAL_REQUIRED',
      details
    };
  }

  evaluate(actionInput) {
    return this.recordAction(actionInput);
  }

  recordAction(actionInput) {
    if (this.status === GUARD_STATUS.TRIPPED) {
      return this.lastEvaluation;
    }

    const trace = createActionTrace({
      ...actionInput,
      turnIndex: actionInput.turnIndex ?? (this.turnCount + 1)
    });

    this.traces.push(trace);
    this.turnCount = trace.turnIndex;

    const actionKey = `${trace.toolName}:${trace.canonicalArgs}`;

    if (this.turnCount >= this.config.maxTurns) {
      this.status = GUARD_STATUS.TRIPPED;
      const escalation = this.createEscalationPayload(
        TRIP_REASON.MAX_TURNS_EXCEEDED,
        trace,
        { limit: this.config.maxTurns, reached: this.turnCount }
      );
      this.lastEvaluation = createGuardEvaluation({
        status: GUARD_STATUS.TRIPPED,
        reason: TRIP_REASON.MAX_TURNS_EXCEEDED,
        turnCount: this.turnCount,
        escalation,
        message: `Maximum turn ceiling of ${this.config.maxTurns} reached.`
      });
      return this.lastEvaluation;
    }

    if (!trace.success) {
      let consecutiveFailures = 0;
      for (let i = this.traces.length - 1; i >= 0; i--) {
        const item = this.traces[i];
        const itemKey = `${item.toolName}:${item.canonicalArgs}`;
        if (itemKey === actionKey && !item.success) {
          consecutiveFailures++;
        } else {
          break;
        }
      }

      if (consecutiveFailures >= this.config.maxConsecutiveRetries) {
        this.status = GUARD_STATUS.TRIPPED;
        const escalation = this.createEscalationPayload(
          TRIP_REASON.CONSECUTIVE_RETRY_LIMIT,
          trace,
          { toolName: trace.toolName, consecutiveFailures, limit: this.config.maxConsecutiveRetries }
        );
        this.lastEvaluation = createGuardEvaluation({
          status: GUARD_STATUS.TRIPPED,
          reason: TRIP_REASON.CONSECUTIVE_RETRY_LIMIT,
          turnCount: this.turnCount,
          escalation,
          message: `Consecutive retry limit reached for ${trace.toolName} (${consecutiveFailures} attempts).`
        });
        return this.lastEvaluation;
      }
    }

    const keys = this.traces.map(t => `${t.toolName}:${t.canonicalArgs}`);
    const maxLen = Math.min(this.config.maxCycleLength, Math.floor(keys.length / this.config.maxCycleRepetitions));

    for (let len = 1; len <= maxLen; len++) {
      if (len === 1) {
        const lastSlice = this.traces.slice(-this.config.maxCycleRepetitions);
        const hasFailure = lastSlice.some(t => !t.success);
        if (hasFailure) {
          continue;
        }
      }

      const totalWindow = len * this.config.maxCycleRepetitions;
      const windowKeys = keys.slice(-totalWindow);
      const cyclePattern = windowKeys.slice(0, len);

      let isMatch = true;
      for (let r = 1; r < this.config.maxCycleRepetitions; r++) {
        const segment = windowKeys.slice(r * len, (r + 1) * len);
        for (let i = 0; i < len; i++) {
          if (segment[i] !== cyclePattern[i]) {
            isMatch = false;
            break;
          }
        }
        if (!isMatch) break;
      }

      if (isMatch) {
        this.status = GUARD_STATUS.TRIPPED;
        const escalation = this.createEscalationPayload(
          TRIP_REASON.CYCLE_DETECTED,
          trace,
          {
            cycleLength: len,
            repetitions: this.config.maxCycleRepetitions,
            pattern: cyclePattern
          }
        );
        this.lastEvaluation = createGuardEvaluation({
          status: GUARD_STATUS.TRIPPED,
          reason: TRIP_REASON.CYCLE_DETECTED,
          turnCount: this.turnCount,
          escalation,
          message: `Detected repeating ${len}-cycle repeated ${this.config.maxCycleRepetitions} times.`
        });
        return this.lastEvaluation;
      }
    }

    if (this.turnCount >= this.config.warningTurnThreshold) {
      this.status = GUARD_STATUS.WARNING;
      this.lastEvaluation = createGuardEvaluation({
        status: GUARD_STATUS.WARNING,
        reason: null,
        turnCount: this.turnCount,
        escalation: null,
        message: `Turn count ${this.turnCount} reached warning threshold (${this.config.warningTurnThreshold}).`
      });
      return this.lastEvaluation;
    }

    this.status = GUARD_STATUS.HEALTHY;
    this.lastEvaluation = createGuardEvaluation({
      status: GUARD_STATUS.HEALTHY,
      reason: null,
      turnCount: this.turnCount,
      escalation: null,
      message: 'Active Focus loop guard healthy.'
    });
    return this.lastEvaluation;
  }
}
