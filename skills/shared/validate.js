// Validation utilities for skills

import { ValidationError } from "./errors.js";

export function assertString(value, fieldName, skillName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(skillName, `${fieldName} must be a non-empty string`, fieldName, value);
  }
  return value;
}

export function assertNumber(value, fieldName, skillName) {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ValidationError(skillName, `${fieldName} must be a valid number`, fieldName, value);
  }
  return value;
}

export function assertObject(value, fieldName, skillName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(skillName, `${fieldName} must be an object`, fieldName, value);
  }
  return value;
}

export function assertArray(value, fieldName, skillName) {
  if (!Array.isArray(value)) {
    throw new ValidationError(skillName, `${fieldName} must be an array`, fieldName, value);
  }
  return value;
}

export function assertBoolean(value, fieldName, skillName) {
  if (typeof value !== "boolean") {
    throw new ValidationError(skillName, `${fieldName} must be a boolean`, fieldName, value);
  }
  return value;
}

export function assertOneOf(value, allowed, fieldName, skillName) {
  if (!allowed.includes(value)) {
    throw new ValidationError(
      skillName,
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      fieldName,
      value
    );
  }
  return value;
}
