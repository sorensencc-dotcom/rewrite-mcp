/**
 * schemaValidation.js - Schema validation utilities
 * @version 1.0.0
 * @date 2026-05-30
 *
 * Provides schema validation for telemetry, messages, and structured data
 */

/**
 * Validate an object against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAgainstSchema(data, schema) {
  const errors = [];

  // Check required fields
  if (schema.required_fields) {
    for (const field of schema.required_fields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check field types if schema defines them
  if (schema.field_types) {
    for (const [field, expectedType] of Object.entries(schema.field_types)) {
      if (field in data && data[field] !== null) {
        const actualType = typeof data[field];
        if (actualType !== expectedType) {
          errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  // Check scores schema if present
  if (schema.scores_schema && data.scores) {
    for (const [field, typeSpec] of Object.entries(schema.scores_schema)) {
      if (field in data.scores) {
        const value = data.scores[field];
        const validTypes = typeSpec.split('|');
        const valueType = value === null ? 'null' : typeof value;

        if (!validTypes.includes(valueType)) {
          errors.push(`Score field ${field}: expected one of [${validTypes.join(', ')}], got ${valueType}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a value against a type spec (e.g., "string|null", "number")
 * @param {*} value - Value to validate
 * @param {string} typeSpec - Type specification (comma or pipe separated)
 * @returns {boolean} Whether value matches type spec
 */
export function validateType(value, typeSpec) {
  const allowedTypes = typeSpec.split(/[|,]/).map(t => t.trim());
  const valueType = value === null ? 'null' : typeof value;

  return allowedTypes.includes(valueType);
}

/**
 * Validate a number is within a range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean}
 */
export function validateRange(value, min, max) {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Validate an object has specific keys
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredKeys - Required keys
 * @returns {{valid: boolean, missingKeys: string[]}}
 */
export function validateKeys(obj, requiredKeys) {
  const missingKeys = requiredKeys.filter(key => !(key in obj));
  return {
    valid: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Validate enum value
 * @param {*} value - Value to validate
 * @param {string[]} allowedValues - Allowed values
 * @returns {boolean}
 */
export function validateEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Validate a string matches a pattern
 * @param {string} value - Value to validate
 * @param {RegExp|string} pattern - Pattern to match
 * @returns {boolean}
 */
export function validatePattern(value, pattern) {
  if (typeof value !== 'string') {
    return false;
  }

  if (typeof pattern === 'string') {
    return new RegExp(pattern).test(value);
  }

  return pattern.test(value);
}

/**
 * Validate an array of items against a schema
 * @param {Array} items - Items to validate
 * @param {Object} itemSchema - Schema for each item
 * @returns {{valid: boolean, errors: Object[]}}
 */
export function validateArray(items, itemSchema) {
  if (!Array.isArray(items)) {
    return {
      valid: false,
      errors: ['Expected an array']
    };
  }

  const errors = [];
  for (let i = 0; i < items.length; i++) {
    const result = validateAgainstSchema(items[i], itemSchema);
    if (!result.valid) {
      errors.push({
        index: i,
        errors: result.errors
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  validateAgainstSchema,
  validateType,
  validateRange,
  validateKeys,
  validateEnum,
  validatePattern,
  validateArray
};
