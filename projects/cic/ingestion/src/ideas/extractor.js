/**
 * Idea Extractor - Pulls structured idea data from a memo.
 */

/**
 * Extracts idea data from a memo.
 * 
 * @param {Object} memo 
 * @param {number|string} memo.id
 * @param {string} memo.content
 * @param {string[]} memo.tags
 * @returns {Object} Extracted idea (unclustered)
 */
export function extractIdea(memo) {
  const content = memo.content || '';
  const lines = content.split('\n');
  const firstLine = lines[0].trim();

  // Title extraction: First sentence or first line
  let title = firstLine;
  const sentenceEnd = firstLine.search(/[.!?](\s|$)/);
  if (sentenceEnd !== -1) {
    title = firstLine.substring(0, sentenceEnd + 1);
  }

  return {
    title,
    body: `Original memo:\n\n${content}`,
    tags: [...(memo.tags || []), `memos-source-${memo.id}`]
  };
}
