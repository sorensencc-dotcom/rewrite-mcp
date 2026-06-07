/**
 * CIC Benchmark Runner Skill (45.2)
 *
 * Automate RL benchmark pipeline with cost tracking and resumable runs.
 * Integrates with cost-optimizer for spend tracking and rewrite-labs-orchestrator for pipeline monitoring.
 */

import fs from 'fs';
import path from 'path';

// In-memory storage for benchmark state (would use context-memory-manager in production)
const benchmarkState = new Map();

export async function cicBenchmarkRunner(params) {
  const startTime = Date.now();

  try {
    // Validate input
    validateInput(params);

    const {
      benchmarkSuite,
      model,
      datasetSize,
      parallelCount = 2,
      creditLimit = 5000,
      resumeFromStep = null,
      outputPath
    } = params;

    // Ensure output directory exists
    ensureOutputDirectory(outputPath);

    // Check credit balance before starting
    const creditCheck = await checkCreditBalance(creditLimit);
    if (!creditCheck.available) {
      throw new Error(`Insufficient credits: ${creditCheck.remaining}/${creditLimit} USD available`);
    }

    // Load or create benchmark run
    const runId = resumeFromStep ? extractRunId(resumeFromStep) : generateRunId();
    let benchmarkRun = benchmarkState.get(runId) || {
      runId,
      benchmarkSuite,
      model,
      datasetSize,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      steps: [],
      costs: [],
      results: {}
    };

    // Resume or initialize
    const startingStep = resumeFromStep ? extractStepNumber(resumeFromStep) : 0;

    // Execute benchmark phases
    const phases = generatePhases(benchmarkSuite, datasetSize);
    let totalCost = 0;

    for (let i = startingStep; i < phases.length; i++) {
      const phase = phases[i];

      // Check if we're approaching credit limit
      if (totalCost > creditLimit * 0.9) {
        benchmarkRun.status = 'paused';
        benchmarkRun.pausedAt = new Date().toISOString();
        benchmarkRun.lastCompletedStep = i;
        benchmarkState.set(runId, benchmarkRun);
        return {
          success: false,
          reason: 'Credit limit approaching',
          runId,
          completedSteps: i,
          totalSteps: phases.length,
          totalCost,
          message: `Paused at step ${i}. Resume with resumeFromStep: "phase-${Math.floor(i/3)}-run-${i}"`,
          checkpoint: `phase-${Math.floor(i/3)}-run-${i}`
        };
      }

      // Execute phase with cost tracking
      const phaseResult = await executePhase(phase, model, parallelCount);
      const phaseCost = phaseResult.cost || 0;
      totalCost += phaseCost;

      benchmarkRun.steps.push({
        stepIndex: i,
        phaseId: phase.id,
        status: 'completed',
        timestamp: new Date().toISOString(),
        duration: phaseResult.duration,
        cost: phaseCost
      });

      benchmarkRun.costs.push({
        phaseId: phase.id,
        model,
        cost: phaseCost,
        timestamp: new Date().toISOString()
      });

      benchmarkRun.results[phase.id] = phaseResult.metrics;
    }

    // Mark as complete
    benchmarkRun.status = 'completed';
    benchmarkRun.completedAt = new Date().toISOString();
    benchmarkRun.totalCost = totalCost;
    benchmarkState.set(runId, benchmarkRun);

    // Write results to output path
    const resultPath = path.join(outputPath, `benchmark-${runId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(benchmarkRun, null, 2));

    const elapsed = Date.now() - startTime;

    return {
      success: true,
      runId,
      benchmarkSuite,
      model,
      datasetSize,
      status: 'completed',
      totalSteps: phases.length,
      totalCost,
      elapsedMs: elapsed,
      outputFile: resultPath,
      results: {
        passes: Object.keys(benchmarkRun.results).length,
        costPerStep: (totalCost / phases.length).toFixed(2),
        averageStepDuration: calculateAverageDuration(benchmarkRun.steps)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      elapsedMs: Date.now() - startTime
    };
  }
}

/**
 * Validate input parameters against schema
 */
function validateInput(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('params must be an object');
  }

  const required = ['benchmarkSuite', 'model', 'datasetSize', 'outputPath'];
  for (const field of required) {
    if (!params[field]) {
      throw new Error(`Required field missing: ${field}`);
    }
  }

  if (!['full', 'sample', 'smoke'].includes(params.datasetSize)) {
    throw new Error('datasetSize must be one of: full, sample, smoke');
  }

  if (params.parallelCount && (params.parallelCount < 1 || params.parallelCount > 10)) {
    throw new Error('parallelCount must be between 1 and 10');
  }

  if (params.creditLimit && params.creditLimit < 10) {
    throw new Error('creditLimit must be at least 10');
  }
}

/**
 * Check available API credits (simulated)
 */
async function checkCreditBalance(creditLimit) {
  // In production, this would call the RL API or cost-optimizer skill
  // For now, simulate that we have 80% of the limit available
  const available = creditLimit * 0.8;
  return {
    available: available > 0,
    remaining: available,
    limit: creditLimit
  };
}

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory(outputPath) {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
}

/**
 * Generate benchmark phases based on suite and dataset size
 */
function generatePhases(benchmarkSuite, datasetSize) {
  const basePhasesPerSuite = 5;
  const multiplier = datasetSize === 'full' ? 1 : (datasetSize === 'sample' ? 0.5 : 0.1);
  const phaseCount = Math.ceil(basePhasesPerSuite * multiplier);

  const phases = [];
  for (let i = 0; i < phaseCount; i++) {
    phases.push({
      id: `phase-${i}`,
      name: `${benchmarkSuite} Phase ${i}`,
      estimatedDuration: 300000 + (i * 50000), // 5min base + incremental
      expectedCost: 50 + (i * 10) // $50 base + incremental
    });
  }

  return phases;
}

/**
 * Execute a benchmark phase (simulated)
 */
async function executePhase(phase, model, parallelCount) {
  // Simulate phase execution
  const duration = phase.estimatedDuration + Math.random() * 100000;
  const cost = phase.expectedCost + Math.random() * 20;

  // Simulate parallel runs
  const runResults = [];
  for (let i = 0; i < parallelCount; i++) {
    runResults.push({
      runId: i,
      status: 'success',
      score: Math.random() * 100,
      latency: Math.random() * 2000
    });
  }

  return {
    phaseId: phase.id,
    status: 'completed',
    duration,
    cost,
    metrics: {
      model,
      phaseId: phase.id,
      parallelRuns: parallelCount,
      averageScore: (runResults.reduce((sum, r) => sum + r.score, 0) / runResults.length).toFixed(2),
      averageLatency: (runResults.reduce((sum, r) => sum + r.latency, 0) / runResults.length).toFixed(0),
      allPassed: runResults.every(r => r.status === 'success')
    }
  };
}

/**
 * Generate unique run ID
 */
function generateRunId() {
  return `benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract run ID from checkpoint string (e.g., "phase-3-run-5" -> "phase-3")
 */
function extractRunId(checkpoint) {
  const parts = checkpoint.split('-');
  return parts.slice(0, 2).join('-');
}

/**
 * Extract step number from checkpoint string
 */
function extractStepNumber(checkpoint) {
  const parts = checkpoint.split('-');
  const runNumber = parseInt(parts[parts.length - 1], 10);
  return runNumber || 0;
}

/**
 * Calculate average duration of completed steps
 */
function calculateAverageDuration(steps) {
  if (steps.length === 0) return 0;
  const total = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  return (total / steps.length).toFixed(0);
}
