/**
 * Task Extractor logic - Deterministic parsing of memo content into structured tasks.
 */

/**
 * Parses a memo into a structured task object.
 * 
 * @param {Object} memo
 * @param {number|string} memo.id
 * @param {string} memo.content
 * @param {string[]} memo.tags
 * @returns {Object} Structured task
 */
export function extractTask(memo) {
  const content = memo.content || '';
  const lines = content.split('\n');
  const firstLine = lines[0].trim();
  
  // Title extraction: First sentence or first line
  let title = firstLine;
  const sentenceEnd = firstLine.search(/[.!?](\s|$)/);
  if (sentenceEnd !== -1) {
    title = firstLine.substring(0, sentenceEnd + 1);
  }

  // Optional due-date parsing: due:YYYY-MM-DD
  const dueMatch = content.match(/due:(\d{4}-\d{2}-\d{2})/);
  const due = dueMatch ? dueMatch[1] : null;

  // Optional priority parsing
  // #urgent -> 1, #high -> 2, else -> 3
  let priority = 3;
  const lowerTags = (memo.tags || []).map(t => t.toLowerCase());
  if (lowerTags.includes('urgent')) {
    priority = 1;
  } else if (lowerTags.includes('high')) {
    priority = 2;
  }

  return {
    title,
    body: `Original memo:\n\n${content}`,
    due,
    priority,
    tags: [...(memo.tags || []), `memos-source-${memo.id}`]
  };
}
