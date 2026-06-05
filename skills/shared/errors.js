// Unified error model for skills

export class SkillError extends Error {
  constructor(skillName, message, details = {}) {
    super(message);
    this.name = "SkillError";
    this.skillName = skillName;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      skillName: this.skillName,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class ValidationError extends SkillError {
  constructor(skillName, message, field, value) {
    super(skillName, message, { field, value });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends SkillError {
  constructor(skillName, message, resource) {
    super(skillName, message, { resource });
    this.name = "NotFoundError";
  }
}

export class TimeoutError extends SkillError {
  constructor(skillName, message, duration) {
    super(skillName, message, { duration });
    this.name = "TimeoutError";
  }
}
