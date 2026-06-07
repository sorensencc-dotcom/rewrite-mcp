const CronParser = require('cron-parser');
const { EventEmitter } = require('events');

class Scheduler extends EventEmitter {
  constructor() {
    super();
    this.schedules = new Map();
    this.intervals = new Map();
  }

  schedule(workflowId, scheduleExpr, options = {}) {
    if (!workflowId || !scheduleExpr) {
      throw new Error('workflowId and scheduleExpr required');
    }

    const key = `${workflowId}:${scheduleExpr}`;
    const { timezone = 'UTC', metadata = {} } = options;

    try {
      const interval = CronParser.parseExpression(scheduleExpr, {
        tz: timezone
      });

      const schedule = {
        id: key,
        workflowId,
        expression: scheduleExpr,
        timezone,
        metadata,
        status: 'active',
        nextRun: interval.next().toDate(),
        createdAt: new Date(),
        lastRun: null,
        runCount: 0
      };

      this.schedules.set(key, schedule);
      this._startSchedule(key, scheduleExpr, timezone);

      return schedule;
    } catch (error) {
      throw new Error(`Invalid cron expression: ${error.message}`);
    }
  }

  unschedule(workflowId, scheduleId = null) {
    if (scheduleId) {
      const key = `${workflowId}:${scheduleId}`;
      if (this.schedules.has(key)) {
        this._stopSchedule(key);
        this.schedules.delete(key);
        return true;
      }
    } else {
      for (const [key, sched] of this.schedules) {
        if (sched.workflowId === workflowId) {
          this._stopSchedule(key);
          this.schedules.delete(key);
        }
      }
      return true;
    }
    return false;
  }

  listSchedules(workflowId) {
    const result = [];
    for (const sched of this.schedules.values()) {
      if (sched.workflowId === workflowId) {
        result.push(sched);
      }
    }
    return result;
  }

  trigger(workflowId, scheduleId = null) {
    const key = scheduleId ? `${workflowId}:${scheduleId}` :
                 Array.from(this.schedules.keys()).find(k => k.startsWith(workflowId));

    if (key && this.schedules.has(key)) {
      const schedule = this.schedules.get(key);
      schedule.lastRun = new Date();
      schedule.runCount++;
      this.emit('scheduled', { schedule, manual: true });
      return schedule;
    }
    return null;
  }

  pause(workflowId) {
    for (const [key, sched] of this.schedules) {
      if (sched.workflowId === workflowId && sched.status === 'active') {
        sched.status = 'paused';
        this._stopSchedule(key);
      }
    }
  }

  resume(workflowId) {
    for (const [key, sched] of this.schedules) {
      if (sched.workflowId === workflowId && sched.status === 'paused') {
        sched.status = 'active';
        this._startSchedule(key, sched.expression, sched.timezone);
      }
    }
  }

  skip(workflowId) {
    for (const sched of this.schedules.values()) {
      if (sched.workflowId === workflowId && sched.status === 'active') {
        sched.nextRun = new Date(Date.now() + 60000);
      }
    }
  }

  _startSchedule(key, expr, tz) {
    const interval = setInterval(() => {
      const sched = this.schedules.get(key);
      if (sched && sched.status === 'active') {
        const now = new Date();
        if (now >= sched.nextRun) {
          sched.lastRun = now;
          sched.runCount++;
          this.emit('scheduled', { schedule: sched, manual: false });

          try {
            const parser = CronParser.parseExpression(expr, { tz });
            sched.nextRun = parser.next().toDate();
          } catch (e) {
            sched.status = 'error';
          }
        }
      }
    }, 1000);

    this.intervals.set(key, interval);
  }

  _stopSchedule(key) {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }
  }

  destroy() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.schedules.clear();
  }
}

module.exports = Scheduler;
