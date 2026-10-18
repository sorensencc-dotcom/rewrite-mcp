import {
  GUARD_STATUS,
  TRIP_REASON,
  WORKLOAD_TYPES,
  MODEL_PRICING,
  canonicalizeArgs,
  createGuardConfig,
  createActionTrace,
  createGuardEvaluation,
  calculateCost
} from './types.mjs';
import { ActiveFocusLoopGuard } from './loop-guard.mjs';
import { MuseWonderEvaluationEngine } from './evaluation-engine.mjs';

export {
  GUARD_STATUS,
  TRIP_REASON,
  WORKLOAD_TYPES,
  MODEL_PRICING,
  canonicalizeArgs,
  createGuardConfig,
  createActionTrace,
  createGuardEvaluation,
  calculateCost,
  ActiveFocusLoopGuard,
  MuseWonderEvaluationEngine
};

export async function runCli(args = process.argv.slice(2)) {
  const workloadArg = args.find(a => a.startsWith('--workload='))?.split('=')[1] || 'all';
  const guardArg = args.find(a => a.startsWith('--guard='))?.split('=')[1] !== 'false';

  const engine = new MuseWonderEvaluationEngine();
  const report = engine.runBenchmark({
    workloads: workloadArg,
    useGuard: guardArg
  });

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('index.mjs')) {
  runCli().then(report => {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }).catch(err => {
    process.stderr.write(`Execution failed: ${err.message}\n`);
    process.exit(1);
  });
}
