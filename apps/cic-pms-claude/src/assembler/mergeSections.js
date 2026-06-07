/**
 * pms-claude/src/assembler/mergeSections.js
 * 2026-05-18 v1.0.0
 * Optimized for Claude XML-style wrapping.
 */
export function mergeSections(sections) {
  let prompt = `<system_prompt>\n${sections.system}\n</system_prompt>\n\n`;
  prompt += `<instructions>\n${sections.instructions}\n</instructions>\n\n`;
  
  if (sections.examples && sections.examples.length > 0) {
    prompt += `<examples>\n${sections.examples.map(e => `<example>\n${e}\n</example>`).join('\n')}\n</examples>\n\n`;
  }
  
  if (sections.constraints) {
    prompt += `<constraints>\n${sections.constraints}\n</constraints>\n`;
  }
  
  return prompt.trim();
}