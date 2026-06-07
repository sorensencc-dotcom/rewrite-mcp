// Skill Runtime — Validator Module
// Validates payloads against JSON schemas

import { readFileSync } from "fs";
import { resolve } from "path";

let schemaCache = {};

export async function loadSchema(skillName) {
  if (schemaCache[skillName]) return schemaCache[skillName];

  const schemaPath = resolve(process.cwd(), `skills/${skillName}/schema.json`);
  const schemaText = readFileSync(schemaPath, "utf-8");
  const schema = JSON.parse(schemaText);

  schemaCache[skillName] = schema;
  return schema;
}

export function validatePayload(skillName, payload, schema) {
  if (!schema) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in payload)) {
        errors.push({
          field,
          message: `Required field missing: ${field}`
        });
      }
    }
  }

  // Check property types
  if (schema.properties) {
    for (const [field, def] of Object.entries(schema.properties)) {
      if (!(field in payload)) continue;

      const value = payload[field];
      const expectedType = def.type;

      if (expectedType && !isValidType(value, expectedType)) {
        errors.push({
          field,
          message: `Type mismatch: expected ${expectedType}, got ${typeof value}`,
          value
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidType(value, type) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    default:
      return true;
  }
}

export function clearSchemaCache() {
  schemaCache = {};
}
