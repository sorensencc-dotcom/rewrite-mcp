const { EventEmitter } = require('events');

class TriggerEngine extends EventEmitter {
  constructor() {
    super();
    this.triggers = {
      alert: new Map(),
      metric: new Map(),
      event: new Map(),
      context: new Map()
    };
    this.deduplication = new Map();
    this.dedupWindow = 5000;
  }

  onAlert(severity, handler) {
    if (!this.triggers.alert.has(severity)) {
      this.triggers.alert.set(severity, []);
    }
    this.triggers.alert.get(severity).push(handler);
    return () => this._removeHandler('alert', severity, handler);
  }

  onMetric(metricName, threshold, comparison, handler) {
    const key = `${metricName}:${comparison}:${threshold}`;
    if (!this.triggers.metric.has(key)) {
      this.triggers.metric.set(key, []);
    }
    this.triggers.metric.get(key).push(handler);
    return () => this._removeHandler('metric', key, handler);
  }

  onEvent(eventType, handler) {
    if (!this.triggers.event.has(eventType)) {
      this.triggers.event.set(eventType, []);
    }
    this.triggers.event.get(eventType).push(handler);
    return () => this._removeHandler('event', eventType, handler);
  }

  onContext(contextKey, matcher, handler) {
    const key = `${contextKey}:${matcher}`;
    if (!this.triggers.context.has(key)) {
      this.triggers.context.set(key, []);
    }
    this.triggers.context.get(key).push(handler);
    return () => this._removeHandler('context', key, handler);
  }

  fireAlert(severity, alert) {
    const dedupId = `alert:${severity}:${alert.id || alert.message}`;
    if (this._isDeduped(dedupId)) return [];

    const handlers = this.triggers.alert.get(severity) || [];
    const results = [];
    handlers.forEach(h => {
      try {
        results.push(h({ severity, alert, timestamp: new Date() }));
      } catch (e) {
        this.emit('error', { type: 'alert', error: e });
      }
    });
    return results;
  }

  fireMetric(metricName, value) {
    const results = [];
    for (const [key, handlers] of this.triggers.metric) {
      const [mName, comparison, threshold] = key.split(':');
      if (mName === metricName && this._compareValue(value, comparison, parseFloat(threshold))) {
        const dedupId = `metric:${key}:${value}`;
        if (!this._isDeduped(dedupId)) {
          handlers.forEach(h => {
            try {
              results.push(h({ metric: metricName, value, threshold, timestamp: new Date() }));
            } catch (e) {
              this.emit('error', { type: 'metric', error: e });
            }
          });
        }
      }
    }
    return results;
  }

  fireEvent(eventType, data) {
    const dedupId = `event:${eventType}:${JSON.stringify(data)}`;
    if (this._isDeduped(dedupId)) return [];

    const handlers = this.triggers.event.get(eventType) || [];
    const results = [];
    handlers.forEach(h => {
      try {
        results.push(h({ type: eventType, data, timestamp: new Date() }));
      } catch (e) {
        this.emit('error', { type: 'event', error: e });
      }
    });
    return results;
  }

  fireContext(context) {
    const results = [];
    for (const [key, handlers] of this.triggers.context) {
      const [contextKey] = key.split(':');
      if (contextKey in context) {
        handlers.forEach(h => {
          try {
            results.push(h({ context, key: contextKey, value: context[contextKey], timestamp: new Date() }));
          } catch (e) {
            this.emit('error', { type: 'context', error: e });
          }
        });
      }
    }
    return results;
  }

  clearTriggers(type = null) {
    if (type) {
      this.triggers[type].clear();
    } else {
      Object.values(this.triggers).forEach(m => m.clear());
    }
  }

  _removeHandler(type, key, handler) {
    const handlers = this.triggers[type].get(key);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) {
        handlers.splice(idx, 1);
      }
    }
  }

  _isDeduped(id) {
    const now = Date.now();
    if (this.deduplication.has(id)) {
      const lastFire = this.deduplication.get(id);
      if (now - lastFire < this.dedupWindow) {
        return true;
      }
    }
    this.deduplication.set(id, now);
    return false;
  }

  _compareValue(value, comparison, threshold) {
    switch (comparison) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }
}

module.exports = TriggerEngine;
