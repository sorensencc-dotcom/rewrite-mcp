const { EventEmitter } = require('events');
const Scheduler = require('./scheduler');
const TriggerEngine = require('./trigger-engine');
const DecisionEngine = require('./decision-engine');
const RecoveryManager = require('./recovery-manager');

class Orchestrator extends EventEmitter {
  constructor(skillRuntime, telemetry) {
    super();
    this.runtime = skillRuntime;
    this.telemetry = telemetry;
    this.scheduler = new Scheduler();
    this.triggerEngine = new TriggerEngine();
    this.decisionEngine = new DecisionEngine();
    this.recoveryManager = new RecoveryManager();
    this.workflows = new Map();
    this.activeWorkflows = new Map();
    this.maxConcurrent = 10;
    this.currentCount = 0;
  }

  registerWorkflow(id, workflowDef) {
    if (!id || !workflowDef) throw new Error('Workflow id and definition required');
    this.workflows.set(id, workflowDef);
    this.decisionEngine.registry.set(id, workflowDef);
  }

  schedule(workflowId, scheduleExpr, options = {}) {
    if (!this.workflows.has(workflowId)) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    return this.scheduler.schedule(workflowId, scheduleExpr, options);
  }

  unschedule(workflowId, scheduleId = null) {
    return this.scheduler.unschedule(workflowId, scheduleId);
  }

  async invokeWorkflow(workflowId, parameters = {}, context = {}) {
    if (this.currentCount >= this.maxConcurrent) {
      throw new Error('Max concurrent workflows reached');
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentCount++;

    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

      const startTime = Date.now();
      this.activeWorkflows.set(executionId, { workflowId, status: 'running', startTime });

      const execContext = {
        executionId,
        workflowId,
        parameters,
        context,
        startTime: new Date()
      };

      this.recoveryManager.saveSnapshot(executionId, execContext);
      this.emit('workflowStart', execContext);

      let result;
      if (typeof workflow.handler === 'function') {
        result = await this.recoveryManager.retry(
          executionId,
          () => workflow.handler(parameters, context),
          workflowId
        );
      } else if (workflow.skills && workflow.skills.length > 0) {
        result = await this._executeSkillSequence(workflow.skills, parameters, context);
      } else {
        throw new Error('Workflow has no handler or skills');
      }

      const duration = Date.now() - startTime;
      const execEnd = {
        ...execContext,
        status: 'success',
        result,
        duration
      };

      this.activeWorkflows.set(executionId, { ...execEnd, status: 'completed' });
      this.emit('workflowEnd', execEnd);

      if (this.telemetry) {
        this.telemetry.recordWorkflow(workflowId, duration, 'success');
      }

      return result;
    } catch (error) {
      const duration = Date.now() - this.activeWorkflows.get(executionId).startTime;
      const execError = {
        executionId,
        workflowId,
        status: 'error',
        error: error.message,
        duration
      };

      this.activeWorkflows.set(executionId, { ...execError, status: 'failed' });
      this.emit('workflowError', execError);

      if (this.telemetry) {
        this.telemetry.recordWorkflow(workflowId, duration, 'error', error.message);
      }

      throw error;
    } finally {
      this.currentCount--;
      this.activeWorkflows.delete(executionId);
    }
  }

  getStatus() {
    return {
      scheduler: {
        totalSchedules: this.scheduler.schedules.size,
        activeSchedules: Array.from(this.scheduler.schedules.values()).filter(s => s.status === 'active').length
      },
      orchestrator: {
        activeWorkflows: this.activeWorkflows.size,
        maxConcurrent: this.maxConcurrent,
        utilizationPercent: Math.round((this.currentCount / this.maxConcurrent) * 100)
      },
      workflows: {
        registered: this.workflows.size,
        active: this.activeWorkflows.size
      },
      nextScheduled: this._getNextScheduled(5)
    };
  }

  _getNextScheduled(limit = 5) {
    const scheduled = Array.from(this.scheduler.schedules.values())
      .filter(s => s.status === 'active')
      .sort((a, b) => a.nextRun - b.nextRun)
      .slice(0, limit);

    return scheduled.map(s => ({
      workflowId: s.workflowId,
      nextRun: s.nextRun,
      minutesUntilRun: Math.round((s.nextRun - new Date()) / 60000)
    }));
  }

  async _executeSkillSequence(skills, parameters, context) {
    const results = [];

    for (const skillDef of skills) {
      const { skillId, params: skillParams = {} } = skillDef;
      const mergedParams = { ...parameters, ...skillParams };

      try {
        const result = await this.runtime.invoke(skillId, mergedParams);
        results.push({ skillId, result, status: 'success' });
      } catch (error) {
        results.push({ skillId, error: error.message, status: 'error' });

        if (skillDef.onError === 'stop') {
          throw error;
        } else if (skillDef.onError === 'continue') {
          continue;
        }
      }
    }

    return results;
  }

  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, max);
  }

  destroy() {
    this.scheduler.destroy();
    this.triggerEngine.clearTriggers();
    this.decisionEngine.clearRules();
    this.workflows.clear();
    this.activeWorkflows.clear();
  }
}

module.exports = Orchestrator;
