/**
 * MEE Phase Executor Skill (45.1)
 *
 * Execute MEE phases with state tracking, resumable execution, and progress visibility.
 * Integrates with context-memory-manager for state persistence and cost-optimizer for spend tracking.
 */

import EventEmitter from 'events';

// Phase execution state machine
const STATES = {
  IDLE: 'idle',
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled-back'
};

// In-memory storage (would use context-memory-manager in production)
const executionStore = new Map();
const checkpointStore = new Map();

export async function meePhaseExecutor(params) {
  const startTime = Date.now();

  try {
    // Validate input
    validateInput(params);

    const {
      phaseList,
      mode = 'sequential',
      resumeFromStep = null,
      costBudget = 5000,
      timeout = 3600000,
      checkpointInterval = 300000,
      rollbackOnError = true
    } = params;

    // Initialize or load execution context
    const executionId = generateExecutionId();
    let execution = executionStore.get(executionId) || {
      executionId,
      phaseList,
      mode,
      state: STATES.PENDING,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      steps: [],
      results: {},
      costs: { total: 0, perPhase: {} },
      checkpoints: [],
      errors: [],
      lastCheckpoint: null
    };

    execution.state = STATES.RUNNING;
    execution.startedAt = new Date().toISOString();
    executionStore.set(executionId, execution);

    // Determine starting step
    const startingStep = resumeFromStep ? parseCheckpoint(resumeFromStep) : 0;
    let totalCost = 0;
    let lastCheckpointTime = Date.now();

    // Execute phases
    for (let stepIndex = startingStep; stepIndex < phaseList.length; stepIndex++) {
      const phaseId = phaseList[stepIndex];

      // Check timeout
      if (Date.now() - startTime > timeout) {
        execution.state = STATES.PAUSED;
        execution.errors.push({
          step: stepIndex,
          error: 'Timeout exceeded',
          timestamp: new Date().toISOString()
        });
        executionStore.set(executionId, execution);
        return createPausedResponse(execution, stepIndex, totalCost);
      }

      // Check cost budget
      if (totalCost > costBudget * 0.9) {
        execution.state = STATES.PAUSED;
        execution.errors.push({
          step: stepIndex,
          error: 'Cost budget approaching',
          timestamp: new Date().toISOString()
        });
        executionStore.set(executionId, execution);
        return createPausedResponse(execution, stepIndex, totalCost);
      }

      // Execute phase
      const phaseResult = await executePhase(phaseId, mode);
      const phaseCost = phaseResult.cost || 0;
      totalCost += phaseCost;

      execution.steps.push({
        stepIndex,
        phaseId,
        status: phaseResult.success ? 'completed' : 'failed',
        timestamp: new Date().toISOString(),
        duration: phaseResult.duration,
        cost: phaseCost,
        output: phaseResult.summary
      });

      execution.results[phaseId] = phaseResult;
      execution.costs.perPhase[phaseId] = phaseCost;
      execution.costs.total = totalCost;

      // Save checkpoint at interval
      if (Date.now() - lastCheckpointTime > checkpointInterval) {
        const checkpoint = {
          step: stepIndex,
          phaseId,
          timestamp: new Date().toISOString(),
          key: `phase-${phaseId}-step-${stepIndex}`
        };
        execution.checkpoints.push(checkpoint);
        execution.lastCheckpoint = checkpoint;
        checkpointStore.set(checkpoint.key, JSON.parse(JSON.stringify(execution)));
        lastCheckpointTime = Date.now();
      }

      // Handle phase error
      if (!phaseResult.success) {
        if (rollbackOnError && execution.lastCheckpoint) {
          // Rollback to last checkpoint
          const rolled = checkpointStore.get(execution.lastCheckpoint.key);
          if (rolled) {
            execution = rolled;
            execution.state = STATES.ROLLED_BACK;
            executionStore.set(executionId, execution);
            return {
              success: false,
              reason: 'Phase failed, rolled back to checkpoint',
              executionId,
              rollbackTo: execution.lastCheckpoint.key,
              completedSteps: stepIndex,
              totalSteps: phaseList.length,
              totalCost
            };
          }
        } else {
          execution.state = STATES.FAILED;
          execution.errors.push({
            step: stepIndex,
            error: phaseResult.error,
            timestamp: new Date().toISOString()
          });
          executionStore.set(executionId, execution);
          return createFailedResponse(execution);
        }
      }
    }

    // All phases completed successfully
    execution.state = STATES.COMPLETED;
    execution.completedAt = new Date().toISOString();
    executionStore.set(executionId, execution);

    const elapsed = Date.now() - startTime;

    return {
      success: true,
      executionId,
      state: STATES.COMPLETED,
      phaseList,
      mode,
      totalSteps: phaseList.length,
      completedSteps: phaseList.length,
      totalCost,
      elapsedMs: elapsed,
      results: {
        allPassed: Object.values(execution.results).every(r => r.success),
        phasesExecuted: Object.keys(execution.results).length,
        averageCostPerPhase: (totalCost / phaseList.length).toFixed(2),
        checkpointsCreated: execution.checkpoints.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      executionId: 'error-' + generateExecutionId(),
      elapsedMs: Date.now() - startTime
    };
  }
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('params must be an object');
  }

  if (!params.phaseList || !Array.isArray(params.phaseList) || params.phaseList.length === 0) {
    throw new Error('phaseList must be a non-empty array');
  }

  if (params.mode && !['sequential', 'parallel'].includes(params.mode)) {
    throw new Error('mode must be "sequential" or "parallel"');
  }

  if (params.timeout && params.timeout < 60000) {
    throw new Error('timeout must be at least 60000ms (1 minute)');
  }

  if (params.costBudget && params.costBudget < 10) {
    throw new Error('costBudget must be at least 10');
  }

  if (params.checkpointInterval && params.checkpointInterval < 30000) {
    throw new Error('checkpointInterval must be at least 30000ms (30 seconds)');
  }
}

/**
 * Execute a single phase (simulated)
 */
async function executePhase(phaseId, mode) {
  // Simulate phase execution with realistic timing
  const duration = Math.random() * 60000 + 30000; // 30-90 seconds
  const cost = Math.random() * 50 + 25; // $25-75 per phase
  const success = Math.random() > 0.05; // 95% success rate

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, Math.min(duration, 1000)));

  return {
    success,
    phaseId,
    duration,
    cost,
    error: success ? null : `Phase ${phaseId} execution failed`,
    summary: success
      ? `Phase ${phaseId} completed: generated ${Math.floor(Math.random() * 100)} decisions`
      : `Phase ${phaseId} failed after ${duration.toFixed(0)}ms`
  };
}

/**
 * Generate unique execution ID
 */
function generateExecutionId() {
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse checkpoint string (e.g., "phase-45-step-12" -> { step: 12, phase: '45' })
 */
function parseCheckpoint(checkpoint) {
  const parts = checkpoint.split('-');
  const stepIndex = parseInt(parts[parts.length - 1], 10);
  return stepIndex || 0;
}

/**
 * Create paused response
 */
function createPausedResponse(execution, stepIndex, totalCost) {
  return {
    success: false,
    reason: execution.errors[execution.errors.length - 1]?.error || 'Execution paused',
    executionId: execution.executionId,
    state: execution.state,
    completedSteps: stepIndex,
    totalSteps: execution.phaseList.length,
    totalCost,
    lastCheckpoint: execution.lastCheckpoint?.key,
    message: `Paused at step ${stepIndex}. Resume with resumeFromStep: "${execution.lastCheckpoint?.key}"`,
    checkpoint: execution.lastCheckpoint?.key
  };
}

/**
 * Create failed response
 */
function createFailedResponse(execution) {
  return {
    success: false,
    executionId: execution.executionId,
    state: execution.state,
    errors: execution.errors,
    completedSteps: execution.steps.length,
    totalSteps: execution.phaseList.length,
    totalCost: execution.costs.total
  };
}
