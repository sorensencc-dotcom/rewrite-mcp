const logs = [];

module.exports = async function auditLogger(params) {
  try {
    if (!params || typeof params !== 'object') {
      throw new Error('params must be an object');
    }

    const { action = 'log', event, actor, resource, changes } = params;

    if (!action || typeof action !== 'string') {
      throw new Error('action parameter required');
    }

    switch (action) {
      case 'log':
        if (!event || typeof event !== 'string') {
          throw new Error('event required and must be string');
        }
        if (!actor || typeof actor !== 'string') {
          throw new Error('actor required and must be string');
        }
        if (!resource || typeof resource !== 'string') {
          throw new Error('resource required and must be string');
        }
        return logEvent(event, actor, resource, changes);

      case 'query':
        const timeRange = params.timeRange || '7d';
        return queryLogs(timeRange, event, resource);

      case 'export':
        return exportLogs();

      case 'retention':
        const days = params.retentionDays;
        if (typeof days !== 'number' || days < 1) {
          throw new Error('retentionDays must be positive number');
        }
        return cleanupOldLogs(days);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Audit logger error: ${error.message}`);
  }
};

function logEvent(event, actor, resource, changes) {
  const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entry = {
    auditId,
    timestamp: new Date().toISOString(),
    event,
    actor,
    resource,
    action: 'execute',
    result: 'success',
    changes: changes || {},
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    retention: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  };

  logs.push(entry);
  return entry;
}

function queryLogs(timeRange, event = null, resource = null) {
  const days = parseInt(timeRange) || 7;
  const cutoff = new Date(Date.now() - days*24*60*60*1000);

  let filtered = logs.filter(l => new Date(l.timestamp) > cutoff);

  if (event) filtered = filtered.filter(l => l.event === event);
  if (resource) filtered = filtered.filter(l => l.resource === resource);

  return {
    timeRange,
    total: filtered.length,
    logs: filtered
  };
}

function exportLogs() {
  return {
    format: 'jsonl',
    lines: logs.length,
    exported: new Date().toISOString()
  };
}

function cleanupOldLogs(retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays*24*60*60*1000);
  const before = logs.length;
  const filtered = logs.filter(l => new Date(l.timestamp) > cutoff);
  const removed = before - filtered.length;
  logs.length = 0;
  logs.push(...filtered);

  return {
    retentionDays,
    removed,
    remaining: logs.length
  };
}
