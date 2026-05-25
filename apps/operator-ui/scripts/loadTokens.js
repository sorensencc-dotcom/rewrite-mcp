import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CIC Operator-UI Token Loader
 * Version: 1.0.0
 * Description: Transforms tokens.json into CSS variables for the Operator-UI.
 * Author: CIC Design Authority
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TOKENS_PATH = path.resolve(__dirname, '../../control-plane/tokens.json');
const OUTPUT_PATH = path.resolve(__dirname, '../css/tokens.css');

/**
 * Flattens nested token objects into CSS variable compatible names.
 * @param {Object} obj - The token object.
 * @param {string} prefix - The current prefix for recursion.
 * @returns {Object} - Flattened tokens.
 */
function flattenTokens(obj, prefix = '') {
  let tokens = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key;
    
    // Skip non-token metadata
    if (['version', 'meta', 'meta_generated_at', 'meta_generated_by', 'meta_description'].includes(newKey)) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(tokens, flattenTokens(value, newKey));
    } else {
      tokens[newKey] = value;
    }
  }
  return tokens;
}

/**
 * Resolves token references like "{space.md}" to their CSS variable equivalent.
 * @param {string} value - The token value.
 * @returns {string} - The resolved CSS value.
 */
function resolveReferences(value) {
  if (typeof value !== 'string') return value;
  
  // Replace {path.to.token} with var(--path-to-token)
  return value.replace(/\{([\w\.]+)\}/g, (match, path) => {
    const cssVarName = path.replace(/\./g, '-');
    return `var(--${cssVarName})`;
  });
}

async function run() {
  console.log(`[CIC] Loading tokens from: ${TOKENS_PATH}`);
  
  try {
    const tokensRaw = await fs.readFile(TOKENS_PATH, 'utf-8');
    const tokensJson = JSON.parse(tokensRaw);
    
    const flattened = flattenTokens(tokensJson);
    
    let cssContent = `/* 
 * CIC Design Tokens (v${tokensJson.version})
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated at: ${new Date().toISOString()}
 */\n\n:root {\n`;

    for (const [key, value] of Object.entries(flattened)) {
      const cssVarName = `--${key.replace(/\./g, '-')}`;
      const resolvedValue = resolveReferences(value);
      cssContent += `  ${cssVarName}: ${resolvedValue};\n`;
    }

    cssContent += '}\n';

    await fs.writeFile(OUTPUT_PATH, cssContent, 'utf-8');
    console.log(`[CIC] Successfully generated: ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error(`[CIC] Error generating tokens: ${error.message}`);
    process.exit(1);
  }
}

run();
