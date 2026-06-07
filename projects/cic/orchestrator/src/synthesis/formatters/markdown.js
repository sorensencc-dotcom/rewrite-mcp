/**
 * projects/cic/orchestrator/src/synthesis/formatters/markdown.js
 */
export function toMarkdown(result) {
  return `# Synthesis Report: ${result.assetId}\n\n## Executive Summary\n${result.executiveSummary}\n\n## Technical Analysis\n${result.analysis.technical}\n\n## Historical Context\n${result.analysis.historical}\n\n## Narrative Tone\n${result.analysis.narrative}\n\n**Thematic Tags**: ${result.thematicTags.join(', ')}`;
}
