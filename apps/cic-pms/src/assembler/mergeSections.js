/**
 * pms/src/assembler/mergeSections.js
 * 2026-05-18 v1.0.0
 */
export function mergeSections(sections, context) {
  let prompt = `SYSTEM: ${sections.system}\n\n`;
  prompt += `INSTRUCTIONS: ${sections.instructions}\n\n`;
  
  if (context) {
    prompt += `CONTEXT: ${JSON.stringify(context, null, 2)}\n\n`;
  }

  if (sections.examples && sections.examples.length > 0) {
    prompt += `EXAMPLES:\n${sections.examples.map(e => `- ${e}`).join('\n')}\n\n`;
  }
  
  if (sections.constraints) {
    prompt += `CONSTRAINTS: ${sections.constraints}\n`;
  }
  
  return prompt.trim();
}