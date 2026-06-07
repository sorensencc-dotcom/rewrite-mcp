/**
 * normalize.ts
 *
 * This script contains the core logic for the "NORMALIZE" step of the
 * AI OS export pipeline. It reads the raw, platform-specific exports and
 * processes them to produce a clean, deterministic, and governance-compliant
 * version.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// --- Type Definitions ---

/**
 * Represents a single markdown file from the raw export.
 */
interface RawExportFile {
  platform: 'gemini' | 'claude' | 'copilot';
  category: string; // e.g., 'SYSTEM', 'MEMORY'
  content: string;
}

/**
 * Represents a normalized markdown file, ready for merging.
 */
interface NormalizedExportFile {
  category: string;
  filename: string; // e.g., 'gemini_system.md'
  content: string;
  sourcePlatform: 'gemini' | 'claude' | 'copilot' | 'unified';
}

// --- Core Normalization Functions ---

/**
 * Strips volatile, session-specific, or environment-specific data from
 * the content of a raw export file.
 *
 * @param content The raw markdown content of a file.
 * @returns The content with volatile data removed.
 */
export function stripVolatileData(content: string): string {
  let cleanedContent = content;

  // 1. GUIDs (e.g., cb5a7ad7-52ca-4f55-8bf5-016d22440e98)
  cleanedContent = cleanedContent.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[STRIPPED_GUID]');

  // 2. Common file paths (Windows-style and Unix-style, relative and absolute)
  //    Matches C:\...\ or /some/path/to/...
  cleanedContent = cleanedContent.replace(/(C:\(?:[a-zA-Z0-9_\-\s]+\)*[a-zA-Z0-9_\-\s\.]+)|(\/(?:[a-zA-Z0-9_\-\s]+\/)*[a-zA-Z0-9_\-\s\.]+)/g, '[STRIPPED_PATH]');
  //    Matches relative paths like ./skills/generate-ai-system-export/SKILL.md
  cleanedContent = cleanedContent.replace(/\b(\.{1,2}\/[a-zA-Z0-9_\-\s\.\/]+)\b/g, '[STRIPPED_PATH]');

  // 3. Version numbers (vX.Y.Z, X.Y.Z) - be careful not to remove semver from descriptions unless specifically volatile
  cleanedContent = cleanedContent.replace(/\b(v?\d+\.\d+\.\d+(?:-\w+\.\d+)?)\b/g, '[STRIPPED_VERSION]');

  // 4. Timestamps (ISO 8601, YYYY-MM-DD)
  cleanedContent = cleanedContent.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g, '[STRIPPED_TIMESTAMP]');
  cleanedContent = cleanedContent.replace(/\d{4}-\d{2}-\d{2}/g, '[STRIPPED_DATE]');

  // 5. Package-lock type hashes / npm specific volatile data
  cleanedContent = cleanedContent.replace(/"sha512-.+"/g, '"[STRIPPED_HASH]"');

  return cleanedContent;
}

/**
 * Enforces a consistent structure on the markdown content, such as ensuring a
 * single H1 heading and normalizing newlines. More complex restructuring
 * (e.g., alphabetical ordering of sections) would require a Markdown AST parser.
 *
 * @param content The markdown content of a file.
 * @returns The content with a standardized structure.
 */
export function enforceStructure(content: string): string {
  let cleanedContent = content;

  // Remove excessive newlines
  cleanedContent = cleanedContent.replace(/
{3,}/g, '

');

  // Ensure there's a single H1 at the top, if one exists.
  // This is a basic enforcement. Full structural enforcement is very complex.
  const h1Match = cleanedContent.match(/^(#\s.+)/m);
  if (h1Match) {
    const originalH1 = h1Match[1];
    cleanedContent = cleanedContent.replace(originalH1, '').trim(); // Remove original H1
    cleanedContent = originalH1 + '

' + cleanedContent; // Add H1 back to top
  }

  return cleanedContent.trim() + '
'; // Ensure trailing newline
}

/**
 * Processes a single raw export file through all normalization steps.
 *
 * @param file The raw export file to process.
 * @returns A normalized export file.
 */
export function normalizeFile(file: RawExportFile): NormalizedExportFile {
  let content = file.content;
  content = stripVolatileData(content);
  content = enforceStructure(content);

  return {
    category: file.category,
    filename: `${file.platform}_${file.category.toLowerCase()}.md`,
    content: content,
    sourcePlatform: file.platform,
  };
}

// --- Main Orchestration Function ---

/**
 * Main entry point for the normalization step.
 * Reads all files from the raw export directory, normalizes them,
 * and prepares them for the merge step.
 *
 * @param rawExportDir The path to the 'ai-os/_raw' directory.
 * @param normalizedOutputDir The path to write normalized files.
 * @returns An array of normalized export files.
 */
export async function runNormalization(rawExportDir: string, normalizedOutputDir: string): Promise<NormalizedExportFile[]> {
  const normalizedFiles: NormalizedExportFile[] = [];

  // Ensure normalized output directory exists
  await fs.mkdir(normalizedOutputDir, { recursive: true });

  const platforms = ["gemini", "claude", "copilot"]; // Define platforms
  const categories = [ // Define categories, same as in merge.ts
    "SYSTEM", "MEMORY", "RULES", "SKILLS", "AGENTS", "HOOKS", "PLUGINS",
    "CONNECTORS", "WORKFLOWS", "PROMPTS", "CAPABILITIES", "LIMITATIONS"
  ];

  for (const platform of platforms) {
    for (const category of categories) {
      const platformCategoryRawDir = path.join(rawExportDir, platform, category);
      const platformCategoryNormalizedDir = path.join(normalizedOutputDir, platform, category);

      try {
        await fs.mkdir(platformCategoryNormalizedDir, { recursive: true }); // Ensure output category dir exists

        const rawFileNames = await fs.readdir(platformCategoryRawDir);

        for (const rawFileName of rawFileNames) {
          if (!rawFileName.endsWith('.md')) continue; // Only process markdown files

          const rawFilePath = path.join(platformCategoryRawDir, rawFileName);
          const content = await fs.readFile(rawFilePath, 'utf8');

          const rawFile: RawExportFile = {
            platform: platform as 'gemini' | 'claude' | 'copilot',
            category: category,
            content: content,
          };

          const normalizedFile = normalizeFile(rawFile);
          normalizedFiles.push(normalizedFile);

          // Write normalized file to output directory
          await fs.writeFile(path.join(platformCategoryNormalizedDir, normalizedFile.filename), normalizedFile.content, 'utf8');
        }
      } catch (error) {
        // Log missing directories/files gracefully, as per merge.ts error handling logic
        console.warn(`[Normalize] Warning: Could not read raw files for platform ${platform}, category ${category}. Error: ${error.message}`);
        // Create an empty placeholder file for the category if no data was found
        const emptyContent = `# ${platform} ${category}

_No data available._
`;
        const emptyFileName = `${platform.toLowerCase()}_${category.toLowerCase()}.md`;
        await fs.writeFile(path.join(platformCategoryNormalizedDir, emptyFileName), emptyContent, 'utf8');
      }
    }
  }

  console.log(`[Normalize] Generated ${normalizedFiles.length} normalized files.`);
  return normalizedFiles;
}
