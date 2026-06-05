class DecisionEngine {
  constructor(workflowRegistry) {
    this.registry = workflowRegistry || new Map();
    this.rules = [];
  }

  registerRule(triggerType, condition, workflowId, priority = 0) {
    this.rules.push({
      triggerType,
      condition,
      workflowId,
      priority
    });
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  selectWorkflow(trigger) {
    const candidates = this.rules.filter(r => {
      if (r.triggerType !== trigger.type) return false;
      if (typeof r.condition === 'function') {
        try {
          return r.condition(trigger.data);
        } catch {
          return false;
        }
      }
      return true;
    });

    if (candidates.length === 0) return null;
    return candidates[0].workflowId;
  }

  inferParameters(workflowId, trigger) {
    const workflow = this.registry.get(workflowId);
    if (!workflow) return {};

    const params = {};
    const triggerData = trigger.data || {};

    if (workflow.schema && workflow.schema.properties) {
      for (const [paramName, paramSchema] of Object.entries(workflow.schema.properties)) {
        if (paramName in triggerData) {
          params[paramName] = triggerData[paramName];
        } else if (paramSchema.default !== undefined) {
          params[paramName] = paramSchema.default;
        }
      }
    }

    return params;
  }

  rankWorkflows(trigger) {
    const ranked = [];

    for (const rule of this.rules) {
      if (rule.triggerType === trigger.type) {
        let score = rule.priority;

        if (typeof rule.condition === 'function') {
          try {
            const matches = rule.condition(trigger.data);
            if (!matches) continue;
            score += 10;
          } catch {
            continue;
          }
        } else {
          score += 5;
        }

        ranked.push({
          workflowId: rule.workflowId,
          score,
          priority: rule.priority
        });
      }
    }

    return ranked.sort((a, b) => b.score - a.score);
  }

  getDecision(trigger) {
    const workflowId = this.selectWorkflow(trigger);
    if (!workflowId) return { decision: 'skip', reason: 'No matching workflow' };

    const params = this.inferParameters(workflowId, trigger);
    const workflow = this.registry.get(workflowId);

    if (!workflow) {
      return { decision: 'error', reason: `Workflow not found: ${workflowId}` };
    }

    return {
      decision: 'execute',
      workflowId,
      parameters: params,
      schema: workflow.schema,
      timeout: workflow.timeout || 300000
    };
  }

  clearRules() {
    this.rules = [];
  }
}

module.exports = DecisionEngine;
