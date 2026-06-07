/**
 * pms-headless/src/assembler/assemblePrompt.js
 * Headless-optimized: Strips whitespace, compacts instructions.
 */
export function assemblePrompt(pack) {
  const system = pack.sections.system.replace(/\s+/g, ' ').trim();
  const inst = pack.sections.instructions.replace(/\s+/g, ' ').trim();
  
  const prompt = `SYSTEM: ${system}\nINSTRUCTIONS: ${inst}`;
  
  return {
    model: pack.model,
    prompt,
    metadata: { headless: true }
  };
}