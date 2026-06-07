/**
 * pms-strict/src/assembler/assemblePrompt.js
 * Enforces strict JSON output instructions.
 */
export function assemblePrompt(pack) {
  const schemaStr = JSON.stringify(pack.response_schema, null, 2);
  
  let prompt = `SYSTEM: ${pack.sections.system}\n\n`;
  prompt += `INSTRUCTIONS: ${pack.sections.instructions}\n\n`;
  prompt += `CRITICAL: You MUST return a valid JSON object matching this schema:\n${schemaStr}\n\n`;
  prompt += `CONSTRAINTS: ${pack.sections.constraints || 'No additional constraints.'}\n`;
  
  return {
    model: pack.model,
    prompt,
    response_mime_type: 'application/json',
    response_schema: pack.response_schema,
    metadata: { strict: true }
  };
}