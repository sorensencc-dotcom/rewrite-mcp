// Structured logging for skills

export class SkillLogger {
  constructor(skillName) {
    this.skillName = skillName;
  }

  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      skill: this.skillName,
      message,
      ...data
    };
    console.log(JSON.stringify(entry));
    return entry;
  }

  debug(message, data) {
    return this.log("DEBUG", message, data);
  }

  info(message, data) {
    return this.log("INFO", message, data);
  }

  warn(message, data) {
    return this.log("WARN", message, data);
  }

  error(message, error, data) {
    return this.log("ERROR", message, {
      ...data,
      error: error?.message || String(error)
    });
  }
}

export function createLogger(skillName) {
  return new SkillLogger(skillName);
}
