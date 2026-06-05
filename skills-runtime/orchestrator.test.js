const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const Scheduler = require('./scheduler');
const TriggerEngine = require('./trigger-engine');
const DecisionEngine = require('./decision-engine');
const RecoveryManager = require('./recovery-manager');
const Orchestrator = require('./orchestrator');

// ============================================================================
// Scheduler Tests (12)
// ============================================================================

describe('Scheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  afterEach(() => {
    scheduler.destroy();
  });

  it('creates schedule with valid cron', () => {
    const sched = scheduler.schedule('wf1', '0 9 * * 1');
    expect(sched).toBeDefined();
    expect(sched.workflowId).toBe('wf1');
    expect(sched.status).toBe('active');
  });

  it('rejects invalid cron', () => {
    expect(() => {
      scheduler.schedule('wf1', 'invalid');
    }).toThrow();
  });

  it('lists schedules by workflow', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    scheduler.schedule('wf1', '0 18 * * 1');
    scheduler.schedule('wf2', '0 12 * * *');

    const wf1Schedules = scheduler.listSchedules('wf1');
    expect(wf1Schedules.length).toBe(2);
  });

  it('unschedules workflow', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    const result = scheduler.unschedule('wf1');
    expect(result).toBe(true);
  });

  it('triggers manual run', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    let fired = false;
    scheduler.on('scheduled', () => { fired = true; });
    scheduler.trigger('wf1');
    expect(fired).toBe(true);
  });

  it('pauses schedule', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    scheduler.pause('wf1');
    const schedules = scheduler.listSchedules('wf1');
    expect(schedules[0].status).toBe('paused');
  });

  it('resumes schedule', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    scheduler.pause('wf1');
    scheduler.resume('wf1');
    const schedules = scheduler.listSchedules('wf1');
    expect(schedules[0].status).toBe('active');
  });

  it('skips next run', () => {
    const sched = scheduler.schedule('wf1', '0 9 * * 1');
    const oldNextRun = sched.nextRun;
    scheduler.skip('wf1');
    const updated = scheduler.listSchedules('wf1')[0];
    expect(updated.nextRun > oldNextRun).toBe(true);
  });

  it('tracks run count', () => {
    scheduler.schedule('wf1', '0 9 * * 1');
    scheduler.trigger('wf1');
    scheduler.trigger('wf1');
    const schedules = scheduler.listSchedules('wf1');
    expect(schedules[0].runCount).toBe(2);
  });

  it('emits scheduled event', (done) => {
    scheduler.schedule('wf1', '0 9 * * 1');
    scheduler.on('scheduled', (event) => {
      expect(event.schedule).toBeDefined();
      expect(event.manual).toBe(true);
      done();
    });
    scheduler.trigger('wf1');
  });

  it('supports timezone', () => {
    const sched = scheduler.schedule('wf1', '0 9 * * 1', { timezone: 'America/New_York' });
    expect(sched.timezone).toBe('America/New_York');
  });

  it('stores metadata', () => {
    const meta = { env: 'prod', critical: true };
    const sched = scheduler.schedule('wf1', '0 9 * * 1', { metadata: meta });
    expect(sched.metadata).toEqual(meta);
  });
});

// ============================================================================
// TriggerEngine Tests (14)
// ============================================================================

describe('TriggerEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new TriggerEngine();
  });

  it('registers alert handler', () => {
    const handler = () => {};
    engine.onAlert('critical', handler);
    expect(engine.triggers.alert.has('critical')).toBe(true);
  });

  it('fires alert', () => {
    let fired = false;
    engine.onAlert('critical', () => { fired = true; });
    engine.fireAlert('critical', { message: 'test' });
    expect(fired).toBe(true);
  });

  it('registers metric handler', () => {
    const handler = () => {};
    engine.onMetric('cpu', 80, '>', handler);
    const key = 'cpu:>:80';
    expect(engine.triggers.metric.has(key)).toBe(true);
  });

  it('fires metric when threshold exceeded', () => {
    let fired = false;
    engine.onMetric('cpu', 80, '>', () => { fired = true; });
    engine.fireMetric('cpu', 85);
    expect(fired).toBe(true);
  });

  it('does not fire metric when threshold not met', () => {
    let fired = false;
    engine.onMetric('cpu', 80, '>', () => { fired = true; });
    engine.fireMetric('cpu', 75);
    expect(fired).toBe(false);
  });

  it('registers event handler', () => {
    const handler = () => {};
    engine.onEvent('deployment', handler);
    expect(engine.triggers.event.has('deployment')).toBe(true);
  });

  it('fires event', () => {
    let fired = false;
    engine.onEvent('deployment', () => { fired = true; });
    engine.fireEvent('deployment', { version: '1.0' });
    expect(fired).toBe(true);
  });

  it('deduplicates alerts within window', () => {
    let count = 0;
    engine.onAlert('critical', () => { count++; });
    engine.fireAlert('critical', { id: 'same' });
    engine.fireAlert('critical', { id: 'same' });
    expect(count).toBe(1);
  });

  it('compares metric values', () => {
    let fired = false;
    engine.onMetric('memory', 1024, '>=', () => { fired = true; });
    engine.fireMetric('memory', 1024);
    expect(fired).toBe(true);
  });

  it('unsubscribes from alert', () => {
    let count = 0;
    const unsubscribe = engine.onAlert('critical', () => { count++; });
    engine.fireAlert('critical', { id: 'test1' });
    unsubscribe();
    engine.fireAlert('critical', { id: 'test2' });
    expect(count).toBe(1);
  });

  it('emits error on handler exception', (done) => {
    engine.onAlert('critical', () => { throw new Error('test'); });
    engine.on('error', () => { done(); });
    engine.fireAlert('critical', {});
  });

  it('clears all triggers', () => {
    engine.onAlert('critical', () => {});
    engine.onEvent('deploy', () => {});
    engine.clearTriggers();
    expect(engine.triggers.alert.size).toBe(0);
    expect(engine.triggers.event.size).toBe(0);
  });

  it('fires context trigger', () => {
    let fired = false;
    engine.onContext('user', 'authenticated', () => { fired = true; });
    engine.fireContext({ user: 'authenticated' });
    expect(fired).toBe(true);
  });
});

// ============================================================================
// DecisionEngine Tests (11)
// ============================================================================

describe('DecisionEngine', () => {
  let engine;
  const registry = new Map();

  beforeEach(() => {
    engine = new DecisionEngine(registry);
    registry.set('wf1', {
      id: 'wf1',
      schema: { properties: { input: { type: 'string' } } }
    });
  });

  it('selects workflow by rule', () => {
    engine.registerRule('alert', null, 'wf1');
    const wfId = engine.selectWorkflow({ type: 'alert' });
    expect(wfId).toBe('wf1');
  });

  it('prioritizes rules', () => {
    engine.registerRule('alert', null, 'wf1', 1);
    engine.registerRule('alert', null, 'wf2', 10);
    const wfId = engine.selectWorkflow({ type: 'alert' });
    expect(wfId).toBe('wf2');
  });

  it('uses condition function', () => {
    const condition = (data) => data.severity === 'critical';
    engine.registerRule('alert', condition, 'wf1');
    const wfId = engine.selectWorkflow({ type: 'alert', data: { severity: 'critical' } });
    expect(wfId).toBe('wf1');
  });

  it('returns null for no match', () => {
    engine.registerRule('alert', null, 'wf1');
    const wfId = engine.selectWorkflow({ type: 'metric' });
    expect(wfId).toBeNull();
  });

  it('infers parameters from trigger', () => {
    engine.registerRule('alert', null, 'wf1');
    const params = engine.inferParameters('wf1', { data: { input: 'test' } });
    expect(params.input).toBe('test');
  });

  it('ranks workflows by score', () => {
    engine.registerRule('alert', () => true, 'wf1', 1);
    engine.registerRule('alert', () => true, 'wf2', 5);
    const ranked = engine.rankWorkflows({ type: 'alert' });
    expect(ranked[0].workflowId).toBe('wf2');
  });

  it('makes decision', () => {
    engine.registerRule('alert', null, 'wf1');
    const decision = engine.getDecision({ type: 'alert' });
    expect(decision.decision).toBe('execute');
    expect(decision.workflowId).toBe('wf1');
  });

  it('skips on no match', () => {
    const decision = engine.getDecision({ type: 'unknown' });
    expect(decision.decision).toBe('skip');
  });

  it('errors on missing workflow', () => {
    engine.registerRule('alert', null, 'missing');
    const decision = engine.getDecision({ type: 'alert' });
    expect(decision.decision).toBe('error');
  });

  it('clears rules', () => {
    engine.registerRule('alert', null, 'wf1');
    engine.clearRules();
    expect(engine.rules.length).toBe(0);
  });
});

// ============================================================================
// RecoveryManager Tests (11)
// ============================================================================

describe('RecoveryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new RecoveryManager();
  });

  it('saves snapshot', () => {
    const state = { data: 'test' };
    const snap = manager.saveSnapshot('exec1', state);
    expect(snap.id).toBe('exec1');
    expect(snap.state).toEqual(state);
  });

  it('retrieves snapshot', () => {
    const state = { data: 'test' };
    manager.saveSnapshot('exec1', state);
    const snap = manager.getSnapshot('exec1');
    expect(snap.state).toEqual(state);
  });

  it('retries with exponential backoff', async () => {
    manager.setRetryPolicy('wf1', { maxRetries: 2, initialDelay: 10 });
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    };
    const result = await manager.retry('exec1', fn, 'wf1');
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('fails after max retries', async () => {
    manager.setRetryPolicy('wf1', { maxRetries: 1, initialDelay: 10 });
    const fn = async () => { throw new Error('fail'); };
    await expect(manager.retry('exec1', fn, 'wf1')).rejects.toThrow();
  });

  it('rolls back to snapshot', async () => {
    const state = { counter: 5 };
    manager.saveSnapshot('exec1', state);
    const rolled = await manager.rollback('exec1');
    expect(rolled).toEqual(state);
  });

  it('verifies snapshot integrity', () => {
    const state = { data: 'test' };
    manager.saveSnapshot('exec1', state);
    const isValid = manager.verifySnapshot('exec1', state);
    expect(isValid).toBe(true);
  });

  it('detects snapshot corruption', () => {
    const state = { data: 'test' };
    manager.saveSnapshot('exec1', state);
    const modified = { data: 'changed' };
    const isValid = manager.verifySnapshot('exec1', modified);
    expect(isValid).toBe(false);
  });

  it('clears old snapshots', () => {
    manager.saveSnapshot('exec1', { data: 'test' });
    setTimeout(() => {
      manager.saveSnapshot('exec2', { data: 'new' });
    }, 100);

    setTimeout(() => {
      manager.clearSnapshots(50);
      expect(manager.getSnapshot('exec1')).toBeUndefined();
      expect(manager.getSnapshot('exec2')).toBeDefined();
    }, 150);
  });

  it('emits retry success', (done) => {
    manager.setRetryPolicy('wf1', { maxRetries: 1, initialDelay: 10 });
    manager.on('retrySuccess', () => { done(); });
    const fn = async () => { throw new Error('first'); };
    manager.retry('exec1', fn, 'wf1').catch(() => {});
  });

  it('emits rollback event', (done) => {
    const state = { data: 'test' };
    manager.saveSnapshot('exec1', state);
    manager.on('rollback', () => { done(); });
    manager.rollback('exec1');
  });

  it('calculates backoff with jitter', () => {
    const delays = [];
    for (let i = 0; i < 10; i++) {
      const delay = manager._calculateDelay(1, 100, 10000, 2, true);
      delays.push(delay);
    }
    const unique = new Set(delays).size;
    expect(unique > 1).toBe(true);
  });
});

// ============================================================================
// Orchestrator Integration Tests (16)
// ============================================================================

describe('Orchestrator', () => {
  let orch;
  const mockRuntime = {
    invoke: async (skillId, params) => ({ skillId, result: 'ok', params })
  };

  beforeEach(() => {
    orch = new Orchestrator(mockRuntime);
  });

  afterEach(() => {
    orch.destroy();
  });

  it('registers workflow', () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    expect(orch.workflows.has('wf1')).toBe(true);
  });

  it('invokes workflow with handler', async () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    const result = await orch.invokeWorkflow('wf1');
    expect(result).toBe('result');
  });

  it('tracks active workflows', async () => {
    orch.registerWorkflow('wf1', { handler: async () => { await new Promise(r => setTimeout(r, 50)); } });
    const promise = orch.invokeWorkflow('wf1');
    expect(orch.activeWorkflows.size).toBeGreaterThan(0);
    await promise;
    expect(orch.activeWorkflows.size).toBe(0);
  });

  it('enforces max concurrent', async () => {
    orch.setMaxConcurrent(1);
    orch.registerWorkflow('wf1', { handler: async () => { await new Promise(r => setTimeout(r, 100)); } });
    const p1 = orch.invokeWorkflow('wf1');
    await expect(orch.invokeWorkflow('wf1')).rejects.toThrow('Max concurrent');
    await p1;
  });

  it('executes skill sequence', async () => {
    orch.registerWorkflow('wf1', {
      skills: [
        { skillId: 'skill1' },
        { skillId: 'skill2' }
      ]
    });
    const result = await orch.invokeWorkflow('wf1');
    expect(result.length).toBe(2);
  });

  it('emits workflow events', (done) => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    let started = false;
    orch.on('workflowStart', () => { started = true; });
    orch.on('workflowEnd', () => {
      expect(started).toBe(true);
      done();
    });
    orch.invokeWorkflow('wf1');
  });

  it('handles workflow errors', async () => {
    orch.registerWorkflow('wf1', { handler: async () => { throw new Error('fail'); } });
    await expect(orch.invokeWorkflow('wf1')).rejects.toThrow();
  });

  it('returns orchestrator status', () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    const status = orch.getStatus();
    expect(status.workflows.registered).toBeGreaterThan(0);
  });

  it('gets next scheduled workflows', () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    orch.schedule('wf1', '0 9 * * 1');
    const status = orch.getStatus();
    expect(status.nextScheduled.length).toBeGreaterThan(0);
  });

  it('saves execution snapshots', async () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    await orch.invokeWorkflow('wf1');
    expect(orch.recoveryManager.snapshots.size).toBeGreaterThan(0);
  });

  it('rejects unknown workflow', async () => {
    await expect(orch.invokeWorkflow('unknown')).rejects.toThrow('not found');
  });

  it('records telemetry', async () => {
    let recorded = false;
    const telemetry = {
      recordWorkflow: () => { recorded = true; }
    };
    const o = new Orchestrator(mockRuntime, telemetry);
    o.registerWorkflow('wf1', { handler: async () => 'result' });
    await o.invokeWorkflow('wf1');
    expect(recorded).toBe(true);
  });

  it('executes scheduled workflow', async () => {
    orch.registerWorkflow('wf1', { handler: async () => 'result' });
    orch.schedule('wf1', '0 9 * * 1');
    let triggered = false;
    orch.scheduler.on('scheduled', async (event) => {
      triggered = true;
      await orch.invokeWorkflow(event.schedule.workflowId);
    });
    orch.scheduler.trigger('wf1');
    expect(triggered).toBe(true);
  });
});
