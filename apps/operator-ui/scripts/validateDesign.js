import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CIC Design System L1 Validator (v1.1)
 * Description: Scans UI files for compliance with the CIC Design System.
 * Checks: Token usage, component variants, grid breakpoints, shell presence.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const CSS_DIR = path.resolve(ROOT_DIR, 'css');
const HTML_FILES = ['index.html', 'control-room.html', 'dashboard/index.html'];

// Patterns
const RAW_HEX_PATTERN = /#([0-9a-fA-F]{3}){1,2}\b/g;
const RAW_PX_PATTERN = /\b\d+px\b/g;
const COMPONENT_VARIANTS = {
  'cic-panel': ['bordered', 'elevated', 'inline'],
  'cic-alert': ['info', 'warn', 'error', 'success'],
  'cic-stat': ['delta'],
};

async function validateFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const errors = [];
  const relativePath = path.relative(ROOT_DIR, filePath);

  // 1. Token Usage Check (CSS & Inline Styles)
  if (filePath.endsWith('.css') || filePath.endsWith('.html')) {
    const hexMatches = content.match(RAW_HEX_PATTERN);
    if (hexMatches && !filePath.includes('tokens.css') && !filePath.includes('colors_and_type.css')) {
      errors.push(`Raw hex colors found: ${Array.from(new Set(hexMatches)).join(', ')}`);
    }

    const pxMatches = content.match(RAW_PX_PATTERN);
    if (pxMatches && !filePath.includes('tokens.css') && !filePath.includes('colors_and_type.css')) {
      // Filter out matches that are part of a media query line
      const lines = content.split('\n');
      const invalidPx = [];
      
      for (const px of pxMatches) {
        if (px === '0px' || px === '1px') continue;
        
        // Find line containing this px and check if it has @media
        const line = lines.find(l => l.includes(px));
        if (line && line.includes('@media')) continue;
        
        invalidPx.push(px);
      }

      if (invalidPx.length > 0) {
        errors.push(`Raw pixel values found (non-media): ${Array.from(new Set(invalidPx)).join(', ')}`);
      }
    }
  }

  // 2. Component Variant Check (HTML)
  if (filePath.endsWith('.html')) {
    for (const [component, variants] of Object.entries(COMPONENT_VARIANTS)) {
      const componentPattern = new RegExp(`class="[^"]*\\b${component}\\b[^"]*"`, 'g');
      const matches = content.match(componentPattern);
      
      if (matches) {
        for (const match of matches) {
          const hasVariant = variants.some(v => match.includes(v));
          if (!hasVariant && component !== 'cic-stat') {
             errors.push(`Component '${component}' missing variant class (${variants.join(', ')})`);
          }
          if (component === 'cic-stat' && !content.includes('class="delta')) {
             errors.push(`Component 'cic-stat' missing delta element`);
          }
        }
      }
    }

    // 3. Shell Presence Check
    if (!content.includes('cic-shell')) {
      errors.push(`Missing 'cic-shell' frame component`);
    }
  }

  return { path: relativePath, errors };
}

async function run() {
  console.log('--- CIC Design System L1 Validation ---');
  let totalErrors = 0;

  try {
    const cssFiles = (await fs.readdir(CSS_DIR)).map(f => path.join(CSS_DIR, f));
    const htmlFiles = HTML_FILES.map(f => path.join(ROOT_DIR, f));
    
    const filesToValidate = [...cssFiles, ...htmlFiles];

    for (const file of filesToValidate) {
      if ((await fs.stat(file)).isFile()) {
        const result = await validateFile(file);
        if (result.errors.length > 0) {
          console.error(`\n[FAIL] ${result.path}`);
          result.errors.forEach(err => console.error(`  - ${err}`));
          totalErrors += result.errors.length;
        } else {
          console.log(`[PASS] ${result.path}`);
        }
      }
    }

    if (totalErrors > 0) {
      console.error(`\nValidation failed with ${totalErrors} errors.`);
      process.exit(1);
    } else {
      console.log('\nAll files compliant with CIC Design System v1.1.');
    }

  } catch (error) {
    console.error(`Validation error: ${error.message}`);
    process.exit(1);
  }
}

run();
