const { EventEmitter } = require('events');

class RecoveryManager extends EventEmitter {
  constructor() {
    super();
    this.snapshots = new Map();
    this.retryPolicies = new Map();
  }

  saveSnapshot(executionId, state) {
    const snapshot = {
      id: executionId,
      state,
      timestamp: new Date(),
      checksum: this._checksum(JSON.stringify(state))
    };
    this.snapshots.set(executionId, snapshot);
    return snapshot;
  }

  getSnapshot(executionId) {
    return this.snapshots.get(executionId);
  }

  setRetryPolicy(workflowId, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 60000,
      backoffMultiplier = 2,
      backoffJitter = true
    } = options;

    this.retryPolicies.set(workflowId, {
      maxRetries,
      initialDelay,
      maxDelay,
      backoffMultiplier,
      backoffJitter,
      attempt: 0
    });
  }

  async retry(executionId, fn, workflowId) {
    const policy = this.retryPolicies.get(workflowId) || {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      backoffJitter: true
    };

    let lastError;
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          this.emit('retrySuccess', { executionId, attempt });
        }
        return result;
      } catch (error) {
        lastError = error;
        this.emit('retryFailed', { executionId, attempt, error });

        if (attempt < policy.maxRetries) {
          const delay = this._calculateDelay(
            attempt,
            policy.initialDelay,
            policy.maxDelay,
            policy.backoffMultiplier,
            policy.backoffJitter
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Max retries exceeded for ${executionId}: ${lastError.message}`);
  }

  async rollback(executionId) {
    const snapshot = this.snapshots.get(executionId);
    if (!snapshot) {
      throw new Error(`No snapshot found for ${executionId}`);
    }

    this.emit('rollback', { executionId, snapshot });
    return snapshot.state;
  }

  verifySnapshot(executionId, currentState) {
    const snapshot = this.snapshots.get(executionId);
    if (!snapshot) return false;

    const currentChecksum = this._checksum(JSON.stringify(currentState));
    return currentChecksum === snapshot.checksum;
  }

  clearSnapshots(older = null) {
    if (!older) {
      this.snapshots.clear();
      return;
    }

    const now = Date.now();
    const maxAge = older;

    for (const [id, snapshot] of this.snapshots) {
      if (now - snapshot.timestamp.getTime() > maxAge) {
        this.snapshots.delete(id);
      }
    }
  }

  _calculateDelay(attempt, initial, max, multiplier, jitter) {
    const exponential = initial * Math.pow(multiplier, attempt);
    const delay = Math.min(exponential, max);

    if (jitter) {
      return delay * (0.5 + Math.random() * 0.5);
    }
    return delay;
  }

  _checksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

module.exports = RecoveryManager;
